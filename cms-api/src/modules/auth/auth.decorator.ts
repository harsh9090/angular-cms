import 'reflect-metadata';
import { NextFunction, Request, Response } from 'express';
import { GlobalInjector } from '../../constants';
import { AuthService } from './auth.service';
import { ForbiddenException, UnauthorizedException } from '../../error/exceptions';
import { Validator } from '../../validation';

/**
 * User claims
 */
export type UserClaims = {
    /**
     * The roles to verify user is in these roles, ex ['admin','editor']
     */
    roles?: string[];
    /**
     * The permissions to verify, ex ['read','create','update']
     */
    permissions?: string[];
    /**
     * The usernames to verify, ex ['dean','john','kitty']
     */
    users?: string[];
}

/**
 * Decorator to check if request is authorized
 * @param userClaims 
 */
export function Authorize(userClaims?: UserClaims) {
    const defaultClaims: UserClaims = { roles: [], permissions: [], users: [] };
    const { roles: requiredRoles, permissions: requiredPermissions, users } = userClaims ? userClaims : defaultClaims;

    /**
     * @params{any} target - The prototype of the class (Object).
     * @params{string} propertyKey - The name of the method.
     * @params{PropertyDescriptor} descriptor - Property that has a value (in that case the method)
     */
    return function (target: any, propertyName: string, descriptor: TypedPropertyDescriptor<Function>) {
        // Ensure we have the descriptor that might been overriden by another decorator
        if (descriptor === undefined) {
            descriptor = Object.getOwnPropertyDescriptor(target, propertyName);
        }

        if (!descriptor || (typeof descriptor.value !== 'function')) {
            throw new TypeError(`Only methods can be decorated with @Authorize. <${propertyName}> is not a method!`);
        }
        // Copy
        const originalMethod = descriptor.value;
        descriptor.value = function (req: Request, res: Response, next: NextFunction) {
            try {
                Validator.throwIfNull('request', req);
                Validator.throwIfNull('next function', next)

                const injector = req.app.get(GlobalInjector);
                const authService = injector ? <AuthService>injector.get(AuthService) : new AuthService(null, null);

                const isAuthenticated = authService.isAuthenticated(req);
                if (!isAuthenticated) {
                    throw new UnauthorizedException('Unauthorized!');
                }

                const { id, username, roles } = req['user'];
                if (requiredRoles && requiredRoles.length > 0 && !authService.isInRoles(roles, requiredRoles)) {
                    throw new ForbiddenException('Forbidden');
                }
                if (requiredPermissions && requiredPermissions.length > 0) {
                    throw new ForbiddenException('Forbidden');
                }
                if (users && users.length > 0 && !users.some(user => user === username)) {
                    throw new ForbiddenException('Forbidden');
                }

                return originalMethod.apply(this, [req, res, next]);
            } catch (err) {
                next(err);
                return;
            }
        };
    };
}