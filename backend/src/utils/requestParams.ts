import { Request } from 'express';

function firstParamValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export function routeParam(req: Request, name: string): string {
  return firstParamValue(req.params[name]);
}

export function routeParams(req: Request): Record<string, string> {
  return Object.fromEntries(
    Object.entries(req.params).map(([key, value]) => [key, firstParamValue(value)])
  );
}
