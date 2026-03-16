import { Request } from 'express';

/** Payload del JWT (ajustar según backend) */
export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/** Request extendido con usuario autenticado */
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}
