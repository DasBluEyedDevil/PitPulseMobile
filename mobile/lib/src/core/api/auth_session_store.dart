import 'dart:async';
import 'dart:math';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'api_config.dart';

/// A complete, authoritative authentication tuple.
///
/// Raw credential keys remain separate for backwards compatibility, but they
/// are visible only while [visibilityKey] contains the same active revision
/// before and after every field is read.
class StoredAuthSession {
  const StoredAuthSession({
    required this.revision,
    required this.accessToken,
    required this.userJson,
    this.refreshToken,
  });

  final String revision;
  final String accessToken;
  final String? refreshToken;
  final String userJson;
}

class AuthSessionInvalidationResult {
  const AuthSessionInvalidationResult(this.failedKeys);

  final Set<String> failedKeys;

  bool get hasResidualCredentials => failedKeys.isNotEmpty;
}

/// Provides atomic visibility for the secure-storage authentication tuple.
///
/// Secure storage does not support transactions, so a write-ahead revision
/// marker is the authority:
///
/// * `committing:<revision>` hides every raw key while a commit is incomplete.
/// * `active:<revision>` exposes a complete tuple.
/// * `loggedOut:<revision>` durably hides raw residue left by delete failures.
class AuthSessionStore {
  AuthSessionStore(this._storage);

  static const visibilityKey = 'auth_session_visibility_v1';
  static const refreshTokenKey = 'refresh_token';

  final FlutterSecureStorage _storage;
  final Random _random = Random.secure();
  int _revisionSequence = 0;
  Future<void>? _writeTail;

  Future<StoredAuthSession?> readSession() async {
    try {
      final markerBefore = await _storage.read(key: visibilityKey);
      if (markerBefore == null) {
        return _readAndMigrateLegacySession();
      }
      if (!_isActive(markerBefore)) return null;

      final accessToken = await _storage.read(key: ApiConfig.tokenKey);
      final refreshToken = await _storage.read(key: refreshTokenKey);
      final userJson = await _storage.read(key: ApiConfig.userKey);
      final markerAfter = await _storage.read(key: visibilityKey);
      if (markerAfter != markerBefore) return null;

      return _completeSession(
        revision: markerBefore.substring('active:'.length),
        accessToken: accessToken,
        refreshToken: refreshToken,
        userJson: userJson,
      );
    } catch (_) {
      return null;
    }
  }

  Future<String?> readAccessToken() async {
    return (await readSession())?.accessToken;
  }

  Future<String?> readRefreshToken() async {
    return (await readSession())?.refreshToken;
  }

  Future<String?> readUserJson() async {
    return (await readSession())?.userJson;
  }

  Future<bool> commit({
    required String accessToken,
    required String? refreshToken,
    required String userJson,
    required bool Function() isCurrent,
    String? expectedRevision,
  }) {
    return _serializeWrite(() async {
      if (!isCurrent()) return false;
      if (expectedRevision != null) {
        final activeMarker = await _storage.read(key: visibilityKey);
        if (activeMarker != 'active:$expectedRevision') return false;
      }
      final revision = _nextRevision();
      await _storage.write(key: visibilityKey, value: 'committing:$revision');
      if (!isCurrent()) {
        await _clearStaleRawTuple();
        return false;
      }

      await _storage.write(key: ApiConfig.tokenKey, value: accessToken);
      if (!isCurrent()) {
        await _clearStaleRawTuple();
        return false;
      }

      // An empty value is the canonical representation of a missing optional
      // refresh token, preventing an older token from surviving a new commit.
      await _storage.write(key: refreshTokenKey, value: refreshToken ?? '');
      if (!isCurrent()) {
        await _clearStaleRawTuple();
        return false;
      }

      await _storage.write(key: ApiConfig.userKey, value: userJson);
      if (!isCurrent()) {
        await _clearStaleRawTuple();
        return false;
      }

      await _storage.write(key: visibilityKey, value: 'active:$revision');
      return isCurrent();
    });
  }

  Future<bool> updateTokens({
    required String accessToken,
    required String? refreshToken,
    required String expectedRevision,
  }) async {
    final current = await readSession();
    if (current == null || current.revision != expectedRevision) return false;
    return commit(
      accessToken: accessToken,
      refreshToken: refreshToken,
      userJson: current.userJson,
      isCurrent: () => true,
      expectedRevision: expectedRevision,
    );
  }

  Future<bool> updateUserJson(String userJson) async {
    final current = await readSession();
    if (current == null) return false;
    return commit(
      accessToken: current.accessToken,
      refreshToken: current.refreshToken,
      userJson: userJson,
      isCurrent: () => true,
      expectedRevision: current.revision,
    );
  }

  /// Durably invalidates the session before attempting recoverable raw cleanup.
  ///
  /// If writing the tombstone throws, the previous active marker remains
  /// authoritative and callers must not publish a logged-out state.
  Future<AuthSessionInvalidationResult> invalidate() {
    return _serializeWrite(() async {
      await _storage.write(
        key: visibilityKey,
        value: 'loggedOut:${_nextRevision()}',
      );
      return AuthSessionInvalidationResult(await _deleteRawTuple());
    });
  }

  Future<AuthSessionInvalidationResult> retryResidualCleanup() {
    return _serializeWrite(
      () async => AuthSessionInvalidationResult(await _deleteRawTuple()),
    );
  }

  Future<StoredAuthSession?> _readAndMigrateLegacySession() {
    return _serializeWrite(() async {
      // Recheck inside the same writer queue used by commit and logout. A
      // logout that won the queue must never be overwritten by migration.
      final markerBefore = await _storage.read(key: visibilityKey);
      if (markerBefore != null) return null;

      final accessToken = await _storage.read(key: ApiConfig.tokenKey);
      final refreshToken = await _storage.read(key: refreshTokenKey);
      final userJson = await _storage.read(key: ApiConfig.userKey);
      final markerAfter = await _storage.read(key: visibilityKey);
      if (markerAfter != null ||
          !_isComplete(accessToken: accessToken, userJson: userJson)) {
        return null;
      }

      final revision = _nextRevision();
      await _storage.write(key: visibilityKey, value: 'active:$revision');
      final migratedMarker = await _storage.read(key: visibilityKey);
      if (migratedMarker != 'active:$revision') return null;
      return _completeSession(
        revision: revision,
        accessToken: accessToken,
        refreshToken: refreshToken,
        userJson: userJson,
      );
    });
  }

  StoredAuthSession? _completeSession({
    required String revision,
    required String? accessToken,
    required String? refreshToken,
    required String? userJson,
  }) {
    if (accessToken == null ||
        accessToken.isEmpty ||
        userJson == null ||
        userJson.isEmpty) {
      return null;
    }
    return StoredAuthSession(
      revision: revision,
      accessToken: accessToken,
      refreshToken: refreshToken == null || refreshToken.isEmpty
          ? null
          : refreshToken,
      userJson: userJson,
    );
  }

  bool _isComplete({required String? accessToken, required String? userJson}) {
    return accessToken != null &&
        accessToken.isNotEmpty &&
        userJson != null &&
        userJson.isNotEmpty;
  }

  bool _isActive(String marker) {
    return marker.startsWith('active:') && marker.length > 'active:'.length;
  }

  String _nextRevision() {
    _revisionSequence++;
    return '${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}-'
        '${_random.nextInt(1 << 32).toRadixString(36)}-$_revisionSequence';
  }

  Future<Set<String>> _deleteRawTuple() async {
    final failures = <String>{};
    for (final key in [
      ApiConfig.tokenKey,
      ApiConfig.userKey,
      refreshTokenKey,
    ]) {
      try {
        await _storage.delete(key: key);
      } catch (_) {
        failures.add(key);
      }
    }
    return failures;
  }

  Future<void> _clearStaleRawTuple() async {
    await _deleteRawTuple();
  }

  Future<T> _serializeWrite<T>(Future<T> Function() operation) async {
    final previous = _writeTail;
    final completion = Completer<void>();
    final completionFuture = completion.future;
    _writeTail = completionFuture;
    if (previous != null) {
      await previous;
    }
    try {
      return await operation();
    } finally {
      completion.complete();
      if (identical(_writeTail, completionFuture)) {
        _writeTail = null;
      }
    }
  }
}
