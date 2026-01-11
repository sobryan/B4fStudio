export interface Field {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  path?: string; // For upstream fields, the JSON path (e.g. data.attributes.title)
  in?: 'query' | 'path' | 'body' | 'header'; // For request parameters
}

export interface Endpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  requestSchema: Field[]; // Public Input
  responseSchema: Field[]; // Public Output
}

export interface UpstreamApi {
  id: string;
  name: string;
  baseUrl: string;
  endpoints: UpstreamEndpoint[];
}

export interface UpstreamEndpoint {
  id: string;
  path: string;
  method: string;
  requestFields: Field[]; // Upstream Input
  responseFields: Field[]; // Upstream Output
}

export interface ResponseMapping {
  targetFieldId: string; // Public Response Field ID
  sourceApiId: string;
  sourceEndpointId: string;
  sourceFieldPath: string; // Upstream Response Field Path
}

export interface RequestMapping {
  targetApiId: string;
  targetEndpointId: string;
  targetFieldId: string; // Upstream Request Field ID
  
  // Source Configuration
  sourceType: 'public' | 'upstream';
  
  // If sourceType === 'public'
  sourcePublicFieldId?: string;

  // If sourceType === 'upstream' (Chaining)
  sourceApiId?: string;
  sourceEndpointId?: string;
  sourceFieldPath?: string;
}

export interface ClaimMapping {
  id: string;
  claimName: string; // e.g. 'sub', 'role', 'email'
  sourceFieldPath: string; // Path in the Auth Endpoint response
}

export interface SecurityConfig {
  enabled: boolean;
  authApiId?: string;
  authEndpointId?: string;
  tokenExpirationSeconds: number;
  claimsMapping: ClaimMapping[];
}

export interface Project {
  name: string;
  publicEndpoints: Endpoint[];
  upstreamApis: UpstreamApi[];
  responseMappings: ResponseMapping[];
  requestMappings: RequestMapping[];
  securityConfig: SecurityConfig;
}

export type SupportedLanguage = 'java' | 'php' | 'nextjs' | 'python';