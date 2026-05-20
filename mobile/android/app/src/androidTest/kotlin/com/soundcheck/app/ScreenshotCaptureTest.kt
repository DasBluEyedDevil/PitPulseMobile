package com.soundcheck.app

import android.content.Intent
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import tools.fastlane.screengrab.Screengrab
import tools.fastlane.screengrab.locale.LocaleTestRule

@RunWith(AndroidJUnit4::class)
class ScreenshotCaptureTest {
    @Rule
    @JvmField
    val localeTestRule = LocaleTestRule()

    @Test
    fun captureBetaStoreScreenshots() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val device = UiDevice.getInstance(instrumentation)
        val launchIntent =
            context.packageManager.getLaunchIntentForPackage(context.packageName)
                ?: error("No launch intent found for ${context.packageName}")

        launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK or Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(launchIntent)

        device.wait(Until.hasObject(By.pkg(context.packageName).depth(0)), 15_000)
        device.waitForIdle(5_000)
        Screengrab.screenshot("01-login")

        tapFirstVisibleText(device, "Sign Up", "Sign up", "Create Account", "Create account", "Register")
        device.waitForIdle(3_000)
        Screengrab.screenshot("02-sign-up")
    }

    private fun tapFirstVisibleText(device: UiDevice, vararg labels: String) {
        labels.firstNotNullOfOrNull { label ->
            device.findObject(By.textContains(label))
        }?.click()
    }
}
