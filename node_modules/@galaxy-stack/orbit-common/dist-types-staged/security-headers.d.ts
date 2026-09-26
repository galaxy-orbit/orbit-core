/**
 * Secure response headers (helmet-style defaults) shared by the Orbit
 * framework. Zero-cost response headers applied by default:
 *  - REST: OrbitApplication (opt out via `security: false`)
 *  - GraphQL: GraphQLHandler (opt out via `secureHeaders: false`)
 */
export interface SecureHeaderOptions {
    /** Strict-Transport-Security. Default: max-age=15552000; includeSubDomains */
    hsts?: boolean | {
        maxAge?: number;
        includeSubDomains?: boolean;
        preload?: boolean;
    };
    /** X-Frame-Options. Default: SAMEORIGIN. */
    frameguard?: 'DENY' | 'SAMEORIGIN' | false;
    /** X-Content-Type-Options: nosniff. Default: true */
    noSniff?: boolean;
    /** Referrer-Policy. Default: no-referrer */
    referrerPolicy?: string | false;
    /** Cross-Origin-Opener-Policy. Default: same-origin */
    crossOriginOpenerPolicy?: string | false;
    /** Cross-Origin-Resource-Policy. Default: same-origin */
    crossOriginResourcePolicy?: string | false;
    /** Remove X-Powered-By. Default: true */
    hidePoweredBy?: boolean;
    /** Origin-Agent-Cluster: ?1. Default: true */
    originAgentCluster?: boolean;
    /** X-Permitted-Cross-Domain-Policies. Default: none */
    permittedCrossDomainPolicies?: string | false;
    /** X-DNS-Prefetch-Control. Default: off */
    dnsPrefetchControl?: boolean;
}
export declare function buildSecureHeaders(options?: SecureHeaderOptions): Record<string, string>;
/**
 * Apply a precomputed secure-header record onto a Response.
 *
 * Fast path: responses created by the Orbit pipeline have mutable headers,
 * so they are updated in place — no Headers clone, no Response rebuild.
 * Fallback: responses with immutable headers (e.g. forwarded from fetch())
 * are cloned into a new Response, preserving the previous behavior.
 */
export declare function applySecureHeaderRecord(response: Response, secure: Record<string, string>): Response;
/** Merge secure headers into an existing Response (creating a new one). */
export declare function withSecureHeaders(response: Response, options?: SecureHeaderOptions): Response;
