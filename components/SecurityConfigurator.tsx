import React, { useState, useEffect } from 'react';
import { SecurityConfig, UpstreamApi, ClaimMapping, Field } from '../types';
import { Shield, ShieldAlert, Lock, Plus, Trash2, Key } from 'lucide-react';

interface SecurityConfiguratorProps {
  config: SecurityConfig;
  upstreamApis: UpstreamApi[];
  onUpdate: (config: SecurityConfig) => void;
}

const SecurityConfigurator: React.FC<SecurityConfiguratorProps> = ({ config, upstreamApis, onUpdate }) => {
  const [selectedApiId, setSelectedApiId] = useState<string>(config.authApiId || '');
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>(config.authEndpointId || '');
  
  // Available fields from the selected auth endpoint response
  const [availableFields, setAvailableFields] = useState<Field[]>([]);

  useEffect(() => {
    if (selectedApiId && selectedEndpointId) {
        const api = upstreamApis.find(a => a.id === selectedApiId);
        const ep = api?.endpoints.find(e => e.id === selectedEndpointId);
        setAvailableFields(ep?.responseFields || []);
    } else {
        setAvailableFields([]);
    }
  }, [selectedApiId, selectedEndpointId, upstreamApis]);

  const handleToggle = (enabled: boolean) => {
    onUpdate({ ...config, enabled });
  };

  const handleProviderChange = (apiId: string, endpointId: string) => {
      setSelectedApiId(apiId);
      setSelectedEndpointId(endpointId);
      onUpdate({ ...config, authApiId: apiId, authEndpointId: endpointId, claimsMapping: [] }); // Reset mappings on provider change
  };

  const addClaim = () => {
      const newClaim: ClaimMapping = {
          id: crypto.randomUUID(),
          claimName: '',
          sourceFieldPath: ''
      };
      onUpdate({ ...config, claimsMapping: [...config.claimsMapping, newClaim] });
  };

  const updateClaim = (id: string, field: keyof ClaimMapping, value: string) => {
      const updated = config.claimsMapping.map(c => c.id === id ? { ...c, [field]: value } : c);
      onUpdate({ ...config, claimsMapping: updated });
  };

  const removeClaim = (id: string) => {
      onUpdate({ ...config, claimsMapping: config.claimsMapping.filter(c => c.id !== id) });
  };

  if (upstreamApis.length === 0) {
      return (
          <div className="p-12 flex flex-col items-center justify-center text-slate-500 h-full">
              <ShieldAlert size={48} className="mb-4 text-slate-300" />
              <h2 className="text-xl font-semibold mb-2">No Upstream APIs Configured</h2>
              <p>Please import an upstream API (e.g. Identity Service) before configuring security.</p>
          </div>
      );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto h-full overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Shield className="text-indigo-600" />
            Security Configuration
        </h2>
        <p className="text-slate-600">Configure JWT authentication for your BFF. Select the upstream service responsible for validating credentials and define how the token claims are populated.</p>
      </div>

      {/* Toggle Switch */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 flex items-center justify-between">
          <div>
              <h3 className="font-semibold text-lg text-slate-800">Enable JWT Security</h3>
              <p className="text-sm text-slate-500">When enabled, the BFF will require a valid JWT for protected endpoints and expose a /login route.</p>
          </div>
          <button 
            onClick={() => handleToggle(!config.enabled)}
            className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none ${config.enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
          >
              <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${config.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
      </div>

      {config.enabled && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Provider Config */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                  <h3 className="font-semibold text-lg text-slate-800 mb-4 flex items-center gap-2">
                      <Lock size={18} className="text-slate-500" />
                      Authentication Provider
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Upstream Identity API</label>
                          <select 
                            value={selectedApiId}
                            onChange={(e) => {
                                const apiId = e.target.value;
                                const api = upstreamApis.find(a => a.id === apiId);
                                // Default to first endpoint or empty
                                handleProviderChange(apiId, api?.endpoints[0]?.id || '');
                            }}
                            className="w-full border border-slate-200 rounded-lg p-3 bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                              <option value="" disabled>Select API...</option>
                              {upstreamApis.map(api => (
                                  <option key={api.id} value={api.id}>{api.name} ({api.baseUrl})</option>
                              ))}
                          </select>
                      </div>

                      <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Login/Token Endpoint</label>
                          <select 
                             value={selectedEndpointId}
                             onChange={(e) => handleProviderChange(selectedApiId, e.target.value)}
                             disabled={!selectedApiId}
                             className="w-full border border-slate-200 rounded-lg p-3 bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                          >
                              <option value="" disabled>Select Endpoint...</option>
                              {upstreamApis.find(a => a.id === selectedApiId)?.endpoints.map(ep => (
                                  <option key={ep.id} value={ep.id}>{ep.method} {ep.path}</option>
                              ))}
                          </select>
                          <p className="text-[10px] text-slate-400 mt-1">Select the endpoint that accepts credentials and returns user details.</p>
                      </div>
                  </div>
              </div>

              {/* Claims Mapping */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg text-slate-800 flex items-center gap-2">
                        <Key size={18} className="text-slate-500" />
                        JWT Claims Mapping
                    </h3>
                    <div className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
                        Token Expiry: <input 
                            type="number" 
                            className="w-12 bg-transparent border-b border-slate-300 text-center outline-none focus:border-indigo-500"
                            value={config.tokenExpirationSeconds}
                            onChange={(e) => onUpdate({...config, tokenExpirationSeconds: parseInt(e.target.value) || 3600 })}
                        /> s
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 mb-6">Map the fields from your Identity Provider's response to standard JWT claims.</p>

                  <div className="space-y-3 mb-6">
                      <div className="flex text-xs font-bold text-slate-400 uppercase px-2">
                          <div className="flex-1">JWT Claim Name</div>
                          <div className="flex-1">Upstream Response Field</div>
                          <div className="w-8"></div>
                      </div>
                      
                      {config.claimsMapping.map(claim => (
                          <div key={claim.id} className="flex gap-4 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                              <div className="flex-1">
                                  <input 
                                    type="text" 
                                    placeholder="e.g. sub, email, role"
                                    value={claim.claimName}
                                    onChange={(e) => updateClaim(claim.id, 'claimName', e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono focus:border-indigo-500 outline-none"
                                  />
                              </div>
                              <div className="flex items-center text-slate-400"><ArrowRight size={14}/></div>
                              <div className="flex-1">
                                  <select 
                                    value={claim.sourceFieldPath}
                                    onChange={(e) => updateClaim(claim.id, 'sourceFieldPath', e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                                  >
                                      <option value="">Select Field...</option>
                                      {availableFields.map(field => (
                                          <option key={field.id} value={field.path || field.name}>{field.path || field.name} ({field.type})</option>
                                      ))}
                                  </select>
                              </div>
                              <button onClick={() => removeClaim(claim.id)} className="w-8 text-slate-400 hover:text-red-500 flex justify-center">
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      ))}

                      {config.claimsMapping.length === 0 && (
                          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm italic">
                              No claims configured. The JWT will be empty.
                          </div>
                      )}
                  </div>

                  <button 
                    onClick={addClaim}
                    className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors"
                  >
                      <Plus size={16} />
                      Add Claim
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

// Helper icon
const ArrowRight = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);

export default SecurityConfigurator;