import React, { useState } from 'react';
import { UpstreamApi, Field } from '../types';
import { Plus, Trash2, FileJson, CheckCircle, Server } from 'lucide-react';

interface UpstreamManagerProps {
  apis: UpstreamApi[];
  onAddApi: (api: UpstreamApi) => void;
  onRemoveApi: (id: string) => void;
}

const UpstreamManager: React.FC<UpstreamManagerProps> = ({ apis, onAddApi, onRemoveApi }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      
      const apiName = parsed.info?.title || "Imported API";
      const host = parsed.host ? `https://${parsed.host}` : (parsed.servers?.[0]?.url || 'http://localhost');
      
      const newEndpoints = [];
      
      if (parsed.paths) {
        for (const [path, methods] of Object.entries(parsed.paths)) {
            for(const [method, details] of Object.entries(methods as any)) {
                 const typedDetails = details as any;
                 
                 // --- Parse Response Fields ---
                 const responseSchema = typedDetails.responses?.['200']?.content?.['application/json']?.schema 
                                     || typedDetails.responses?.['200']?.schema;
                 
                 const responseFields: Field[] = [];
                 const extractFields = (schema: any, prefix = '', targetArr: Field[], location: 'body' | 'path' | 'query' = 'body') => {
                    if (!schema) return;
                    if (schema.properties) {
                        Object.entries(schema.properties).forEach(([key, val]: [string, any]) => {
                            targetArr.push({
                                id: `${prefix}${key}`,
                                name: key,
                                type: val.type || 'string',
                                path: `${prefix}${key}`,
                                in: location
                            });
                            if (val.type === 'object') {
                                extractFields(val, `${prefix}${key}.`, targetArr, location);
                            }
                        });
                    }
                 };

                 extractFields(responseSchema, '', responseFields);
                 if(responseFields.length === 0) {
                     responseFields.push({ id: 'data', name: 'Raw Data', type: 'object', path: 'data', in: 'body' });
                 }

                 // --- Parse Request Fields (Params + Body) ---
                 const requestFields: Field[] = [];
                 
                 // 1. Parameters (Path, Query, Header)
                 if (typedDetails.parameters && Array.isArray(typedDetails.parameters)) {
                     typedDetails.parameters.forEach((param: any) => {
                         requestFields.push({
                             id: `${param.in}.${param.name}`,
                             name: param.name,
                             type: param.schema?.type || 'string',
                             path: param.name,
                             in: param.in
                         });
                     });
                 }

                 // 2. Request Body
                 const requestBodySchema = typedDetails.requestBody?.content?.['application/json']?.schema;
                 if (requestBodySchema) {
                     extractFields(requestBodySchema, 'body.', requestFields, 'body');
                 }

                 newEndpoints.push({
                     id: `${apiName}-${method}-${path}`,
                     path: path,
                     method: method.toUpperCase(),
                     requestFields: requestFields,
                     responseFields: responseFields
                 });
            }
        }
      }

      const newApi: UpstreamApi = {
        id: crypto.randomUUID(),
        name: apiName,
        baseUrl: host,
        endpoints: newEndpoints
      };

      onAddApi(newApi);
      setJsonInput('');
      setError(null);
    } catch (e) {
      console.error(e);
      setError("Invalid JSON format or unsupported Swagger version.");
    }
  };

  const loadDemoData = () => {
     setJsonInput(JSON.stringify({
        "openapi": "3.0.0",
        "info": { "title": "Book Service", "version": "1.0.0" },
        "servers": [{ "url": "https://api.books.com" }],
        "paths": {
            "/books/{isbn}": {
                "get": {
                    "parameters": [
                        { "name": "isbn", "in": "path", "schema": { "type": "string" } },
                        { "name": "detailed", "in": "query", "schema": { "type": "boolean" } }
                    ],
                    "responses": {
                        "200": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "isbn": { "type": "string" },
                                            "title": { "type": "string" },
                                            "authorId": { "type": "string" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
     }, null, 2));
  }
  
  const loadDemoAuthorData = () => {
     setJsonInput(JSON.stringify({
        "openapi": "3.0.0",
        "info": { "title": "Author Service", "version": "1.0.0" },
        "servers": [{ "url": "https://api.authors.com" }],
        "paths": {
            "/authors/{id}": {
                "get": {
                    "parameters": [
                         { "name": "id", "in": "path", "schema": { "type": "string" } }
                    ],
                    "responses": {
                        "200": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "id": { "type": "string" },
                                            "fullName": { "type": "string" },
                                            "bio": { "type": "string" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
     }, null, 2));
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Upstream APIs</h2>
        <p className="text-slate-600">Import Swagger/OpenAPI JSON specifications to define the services your BFF will consume.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[600px]">
        {/* Import Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileJson size={20} className="text-blue-500" />
                Import Definition
             </h3>
             <div className="flex gap-2">
                 <button onClick={loadDemoData} className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded">Load Book Demo</button>
                 <button onClick={loadDemoAuthorData} className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded">Load Author Demo</button>
             </div>
          </div>
          
          <textarea
            className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 resize-none"
            placeholder="Paste Swagger/OpenAPI JSON here..."
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          />
          
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          
          <button
            onClick={handleImport}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
          >
            <Plus size={18} />
            Import API
          </button>
        </div>

        {/* List Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-y-auto">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Server size={20} className="text-indigo-500" />
            Connected Services
          </h3>
          
          {apis.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                <Server size={48} className="mb-4" />
                <p>No upstream APIs added yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {apis.map((api) => (
                <div key={api.id} className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors group">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800">{api.name}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-1">{api.baseUrl}</p>
                    </div>
                    <button 
                        onClick={() => onRemoveApi(api.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Endpoints</p>
                    <div className="space-y-1">
                        {api.endpoints.map(ep => (
                            <div key={ep.id} className="flex flex-col gap-1 py-1">
                                <div className="flex items-center gap-2 text-sm">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold 
                                        ${ep.method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {ep.method}
                                    </span>
                                    <span className="font-mono text-slate-600 truncate">{ep.path}</span>
                                </div>
                                <div className="pl-8 flex gap-2 text-[10px] text-slate-400">
                                    <span>Inputs: {ep.requestFields.length}</span>
                                    <span>Outputs: {ep.responseFields.length}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpstreamManager;