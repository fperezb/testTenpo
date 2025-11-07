import {auth} from 'express-oauth2-jwt-bearer';

const issuerBaseURL = process.env.OAUTH_ISSUER;
const audience = process.env.OAUTH_AUDIENCE;
const jwksUri = process.env.OAUTH_JWKS_URI;

export const requireAuth = auth({
  issuerBaseURL,
  audience,
  jwksUri,
  tokenSigningAlg: 'RS256'
});
