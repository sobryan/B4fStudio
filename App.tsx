import React, { useState } from 'react';
import { Project, Endpoint, UpstreamApi, ResponseMapping, RequestMapping, SecurityConfig } from './types';
import Sidebar from './components/Sidebar';
import EndpointDesigner from './components/EndpointDesigner';
import UpstreamManager from './components/UpstreamManager';
import Mapper from './components/Mapper';
import SecurityConfigurator from './components/SecurityConfigurator';
import CodeGenerator from './components/CodeGenerator';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'endpoints' | 'upstream' | 'mapper' | 'security' | 'generate'>('endpoints');
  
  // State
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [upstreamApis, setUpstreamApis] = useState<UpstreamApi[]>([]);
  const [responseMappings, setResponseMappings] = useState<ResponseMapping[]>([]);
  const [requestMappings, setRequestMappings] = useState<RequestMapping[]>([]);
  
  // Security State
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>({
      enabled: false,
      tokenExpirationSeconds: 3600,
      claimsMapping: [
          { id: 'default_sub', claimName: 'sub', sourceFieldPath: 'id' },
          { id: 'default_email', claimName: 'email', sourceFieldPath: 'email' }
      ]
  });
  
  // Mapper State
  const [mappingEndpoint, setMappingEndpoint] = useState<Endpoint | null>(null);

  // Handlers
  const handleSelectForMapping = (ep: Endpoint) => {
    setMappingEndpoint(ep);
    setActiveView('mapper');
  };

  const handleSaveMappings = (newResponseMappings: ResponseMapping[], newRequestMappings: RequestMapping[]) => {
      setResponseMappings(newResponseMappings);
      setRequestMappings(newRequestMappings);
      alert('Mappings Saved!');
  };

  const project: Project = {
      name: "My BFF Project",
      publicEndpoints: endpoints,
      upstreamApis: upstreamApis,
      responseMappings: responseMappings,
      requestMappings: requestMappings,
      securityConfig: securityConfig
  };

  const renderContent = () => {
    if (activeView === 'mapper' && mappingEndpoint) {
        return (
            <Mapper 
                publicEndpoint={mappingEndpoint}
                upstreamApis={upstreamApis}
                responseMappings={responseMappings}
                requestMappings={requestMappings}
                onSaveMapping={handleSaveMappings}
                onBack={() => {
                    setMappingEndpoint(null);
                    setActiveView('endpoints');
                }}
            />
        );
    }

    switch (activeView) {
      case 'endpoints':
        return (
            <EndpointDesigner 
                endpoints={endpoints}
                onAddEndpoint={(ep) => setEndpoints([...endpoints, ep])}
                onRemoveEndpoint={(id) => setEndpoints(endpoints.filter(e => e.id !== id))}
                onSelectEndpoint={handleSelectForMapping}
            />
        );
      case 'upstream':
        return (
            <UpstreamManager 
                apis={upstreamApis}
                onAddApi={(api) => setUpstreamApis([...upstreamApis, api])}
                onRemoveApi={(id) => setUpstreamApis(upstreamApis.filter(a => a.id !== id))}
            />
        );
      case 'mapper':
        return (
            <div className="h-full flex items-center justify-center text-slate-500">
                Please select an endpoint from the "Public Endpoints" tab to map.
            </div>
        );
      case 'security':
        return (
            <SecurityConfigurator 
                config={securityConfig}
                upstreamApis={upstreamApis}
                onUpdate={setSecurityConfig}
            />
        );
      case 'generate':
        return <CodeGenerator project={project} />;
      default:
        return <div>Not Found</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <Sidebar activeView={activeView} setView={setActiveView} />
      <main className="flex-1 h-full overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;