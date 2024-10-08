'use server';
import { SignJWT, jwtVerify } from 'jose';
import { Role } from '@prisma/client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DiagnosticReturn } from './utils';

const key = new TextEncoder().encode(process.env.SESSION_KEY);

const cookie = {
    name: 'session',
    options: {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
    },
    duration: 24 * 60 * 60 * 1000,
};

export async function encrypt(payload: any) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1day')
        .sign(key);
}

export async function decrypt(session: string): Promise<DiagnosticReturn> {
    try {
        const { payload } = await jwtVerify(session, key, {
            algorithms: ['HS256'],
        });
        return {
            error: false,
            message: 'Verified JWT',
            data: payload,
        };
    } catch (error: any) {
        return {
            data: undefined,
            error: true,
            message: 'Failed to verify JWT',
        };
    }
}

export async function createSession(userId: number, userRole: Role) {
    const expires = new Date(Date.now() + cookie.duration);
    const session = await encrypt({
        id: userId,
        role: userRole,
        expiry: expires,
    });

    cookies().set(cookie.name, session, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        expires,
    });
    redirect('/dashboard/account');
}

export async function verifySession(): Promise<{ id: number; role: Role }> {
    const sessionCookie: any = cookies().get(cookie.name)?.value;
    const session = await decrypt(sessionCookie);
    if (!session?.data.id) {
        redirect('/login');
    } else {
        return {
            id: session?.data.id as number,
            role: session?.data.role as Role,
        };
    }
}

export async function revokeSession() {
    cookies().delete(cookie.name);
    redirect('/login');
}
