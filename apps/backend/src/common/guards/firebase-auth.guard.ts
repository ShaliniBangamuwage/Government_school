import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedRequestUser } from '@edunexa/shared-types';
import { FirebaseAdminService } from '../../infrastructure/firebase/firebase-admin.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: AuthenticatedRequestUser;
    }>();

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header.');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Malformed Authorization header. Expected: Bearer <token>.');
    }

    try {
      const decoded = await this.firebaseAdminService.verifyToken(token);
      const profile = await this.firebaseAdminService.upsertUserProfile(decoded);

      request.user = {
        uid: decoded.uid,
        email: decoded.email ?? null,
        emailVerified: decoded.email_verified ?? false,
        role: profile.role,
        profile,
      };

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown token verification error';
      throw new UnauthorizedException(`Invalid or expired Firebase token: ${message}`);
    }
  }
}
