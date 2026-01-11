import React, { useState, useMemo } from 'react';
import { Endpoint, UpstreamApi, ResponseMapping, RequestMapping, Field } from '../types';
import { ArrowLeft, Save, Database, ArrowRight, GripHorizontal, Link as LinkIcon, X, Network, ArrowDown, Layers, Zap } from 'lucide-react';

interface MapperProps {
  publicEndpoint: Endpoint;
  upstreamApis: UpstreamApi[];
  responseMappings: ResponseMapping[];
  requestMappings: RequestMapping[];
  onSaveMapping: (res: ResponseMapping[], req: RequestMapping[]) => void;
  onBack: () => void;
}

const Mapper: React.FC<MapperProps> = ({ publicEndpoint, upstreamApis, responseMappings, requestMappings, onSaveMapping, onBack }) => {
  const [localResponseMappings, setLocalResponseMappings] = useState<ResponseMapping[]>(responseMappings);
  const [localRequestMappings, setLocalRequestMappings] = useState<RequestMapping[]>(requestMappings);
  
  const [mode, setMode] = useState<'request' | 'response'>('response'); // Main toggle
  const [requestSourceType, setRequestSourceType] = useState<'public' | 'upstream'>('public'); // Sub-toggle for Request Mode

  // --- Helpers ---
  
  const getResponseMapping = (targetFieldId: string) => localResponseMappings.find(m => m.targetFieldId === targetFieldId);
  const getRequestMapping = (targetFieldId: string) => localRequestMappings.find(m => m.targetFieldId === targetFieldId);

  // --- Chaining / Phase Calculation ---
  const executionPhases = useMemo(() => {
    const endpoints = upstreamApis.flatMap(api => 
        api.endpoints.map(ep => ({ ...ep, apiName: api.name, apiId: api.id }))
    );
    
    const levels = new Map<string, number>(); // EndpointID -> Level
    const dependencies = new Map<string, Set<string>>(); // EndpointID -> Set<SourceEndpointID>

    // Init dependencies
    endpoints.forEach(ep => dependencies.set(ep.id, new Set()));
    localRequestMappings.filter(m => m.sourceType === 'upstream' && m.targetEndpointId && m.sourceEndpointId).forEach(m => {
        dependencies.get(m.targetEndpointId!)?.add(m.sourceEndpointId!);
    });

    // Calculate levels (Iterative topological sort approximation)
    let changed = true;
    let pass = 0;
    while(changed && pass < 10) {
        changed = false;
        pass++;
        endpoints.forEach(ep => {
            const deps = dependencies.get(ep.id)!;
            if (deps.size === 0) {
                if (!levels.has(ep.id)) {
                    levels.set(ep.id, 0);
                    changed = true;
                }
            } else {
                let maxLevel = -1;
                let ready = true;
                for(const d of deps) {
                    if (!levels.has(d)) {
                        ready = false; 
                        break;
                    }
                    maxLevel = Math.max(maxLevel, levels.get(d)!);
                }
                if (ready) {
                    const newLevel = maxLevel + 1;
                    if (levels.get(ep.id) !== newLevel) {
                        levels.set(ep.id, newLevel);
                        changed = true;
                    }
                }
            }
        });
    }

    // Group
    const phases: Record<number, typeof endpoints> = {};
    endpoints.forEach(ep => {
        const lvl = levels.has(ep.id) ? levels.get(ep.id)! : 999; // 999 for unresolved/cycles
        if (!phases[lvl]) phases[lvl] = [];
        phases[lvl].push(ep);
    });
    
    return phases;
  }, [upstreamApis, localRequestMappings]);

  // --- Handlers ---

  const handleDragStart = (e: React.DragEvent, type: 'source_upstream' | 'source_public', data: any) => {
      e.dataTransfer.setData('application/json', JSON.stringify({ type, data }));
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const payload = JSON.parse(raw);

      if (mode === 'response') {
          // 1. Output Mapping: Upstream Response -> Public Output
          if (payload.type === 'source_upstream') {
            const { apiId, endpointId, fieldPath } = payload.data;
            const newMapping: ResponseMapping = {
                targetFieldId: targetId,
                sourceApiId: apiId,
                sourceEndpointId: endpointId,
                sourceFieldPath: fieldPath
            };
            setLocalResponseMappings(prev => [...prev.filter(m => m.targetFieldId !== targetId), newMapping]);
          }
      } else if (mode === 'request') {
          // 2. Input Mapping
          const { apiId, endpointId } = e.currentTarget.dataset as any; // Target Upstream Info
          
          if (payload.type === 'source_public') {
             // Case A: Public Input -> Upstream Request
             const { fieldId } = payload.data;
             const newMapping: RequestMapping = {
                 targetApiId: apiId,
                 targetEndpointId: endpointId,
                 targetFieldId: targetId,
                 sourceType: 'public',
                 sourcePublicFieldId: fieldId
             };
             setLocalRequestMappings(prev => [...prev.filter(m => m.targetFieldId !== targetId), newMapping]);

          } else if (payload.type === 'source_upstream') {
             // Case B: Upstream Response -> Upstream Request (Chaining)
             // Check for self-reference loop (simple check)
             const sourceData = payload.data;
             if (sourceData.apiId === apiId && sourceData.endpointId === endpointId) {
                 alert("Cannot map an endpoint's output to its own input.");
                 return;
             }

             const newMapping: RequestMapping = {
                 targetApiId: apiId,
                 targetEndpointId: endpointId,
                 targetFieldId: targetId,
                 sourceType: 'upstream',
                 sourceApiId: sourceData.apiId,
                 sourceEndpointId: sourceData.endpointId,
                 sourceFieldPath: sourceData.fieldPath
             };
             setLocalRequestMappings(prev => [...prev.filter(m => m.targetFieldId !== targetId), newMapping]);
          }
      }
  };

  const removeMapping = (targetId: string) => {
      if (mode === 'response') {
          setLocalResponseMappings(prev => prev.filter(m => m.targetFieldId !== targetId));
      } else {
          setLocalRequestMappings(prev => prev.filter(m => m.targetFieldId !== targetId));
      }
  };

  const save = () => {
      onSaveMapping(localResponseMappings, localRequestMappings);
  };

  const getSourceDisplay = (mapping: ResponseMapping | RequestMapping) => {
      if (mode === 'response') {
          const m = mapping as ResponseMapping;
          const api = upstreamApis.find(a => a.id === m.sourceApiId);
          const ep = api?.endpoints.find(e => e.id === m.sourceEndpointId);
          return { top: api?.name, sub: ep?.path, val: m.sourceFieldPath, icon: Database };
      } else {
          const m = mapping as RequestMapping;
          if (m.sourceType === 'public') {
              const field = publicEndpoint.requestSchema.find(f => f.id === m.sourcePublicFieldId);
              return { top: 'Public Input', sub: field?.in, val: field?.name, icon: ArrowRight };
          } else {
              const api = upstreamApis.find(a => a.id === m.sourceApiId);
              const ep = api?.endpoints.find(e => e.id === m.sourceEndpointId);
              return { top: api?.name, sub: ep?.path, val: m.sourceFieldPath, icon: Network };
          }
      }
  };

  // Shared Render for Upstream Sources List
  const renderUpstreamSources = () => (
    <div className="space-y-6">
        {upstreamApis.map(api => (
            <div key={api.id} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-bold text-slate-700 text-sm flex items-center justify-between">
                    {api.name}
                    {mode === 'request' && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 rounded border border-indigo-200">Response</span>}
                </div>
                <div className="divide-y divide-slate-100">
                    {api.endpoints.map(ep => (
                        <div key={ep.id} className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ep.method==='GET'?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}`}>{ep.method}</span>
                                <span className="font-mono text-xs text-slate-500">{ep.path}</span>
                            </div>
                            <div className="space-y-2 pl-2">
                                {ep.responseFields.map(field => (
                                    <div 
                                        key={field.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, 'source_upstream', { apiId: api.id, endpointId: ep.id, fieldPath: field.path })}
                                        className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded hover:border-blue-400 hover:shadow-sm cursor-grab active:cursor-grabbing group"
                                    >
                                        <GripHorizontal size={14} className="text-slate-300 group-hover:text-blue-400" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-700">{field.path}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{field.type}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </div>
  );

  const renderRequestFlow = () => {
    const sortedLevels = Object.keys(executionPhases).map(Number).sort((a,b) => a - b);
    
    return (
        <div className="space-y-8 pb-12">
            {sortedLevels.map((level, index) => (
                <div key={level} className="relative animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${index * 100}ms` }}>
                    {index > 0 && (
                        <div className="flex justify-center -mt-8 mb-4 relative z-0">
                            <div className="bg-slate-200 text-slate-400 rounded-full p-1 border-4 border-slate-50 shadow-sm">
                                <ArrowDown size={20} />
                            </div>
                        </div>
                    )}
                    
                    <div className={`rounded-xl p-4 relative z-10 border ${level === 0 ? 'bg-white border-slate-200' : 'bg-white border-indigo-200 shadow-md'}`}>
                        <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 px-1 ${level === 0 ? 'text-slate-500' : 'text-indigo-600'}`}>
                             {level === 0 ? <Layers size={14} /> : <Zap size={14} />}
                             {level === 0 ? "Step 1: Initial Requests" : level === 999 ? "Unreachable / Cycles" : `Step ${level + 1}: Dependent Requests`}
                        </h4>
                        
                        <div className="space-y-4">
                            {executionPhases[level].map(ep => (
                                <div key={ep.id} className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                                    <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ep.method==='GET'?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}`}>{ep.method}</span>
                                            <span className="font-semibold text-xs text-slate-700">{ep.apiName}</span>
                                            <span className="font-mono text-xs text-slate-500">{ep.path}</span>
                                        </div>
                                        {level > 0 && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Chained</span>}
                                    </div>
                                    <div className="p-3 space-y-2">
                                        {ep.requestFields.map(field => {
                                            const mapping = getRequestMapping(field.id);
                                            const sourceInfo = mapping ? getSourceDisplay(mapping) : null;
                                            return (
                                                <div 
                                                    key={field.id}
                                                    data-api-id={ep.apiId}
                                                    data-endpoint-id={ep.id}
                                                    onDragOver={e => e.preventDefault()}
                                                    onDrop={(e) => handleDrop(e, field.id)}
                                                    className={`p-2 rounded border-2 transition-all ${mapping ? 'bg-blue-50 border-blue-200' : 'bg-white border-dashed border-slate-200 hover:border-blue-300'}`}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] bg-slate-200 text-slate-600 px-1 rounded uppercase">{field.in}</span>
                                                            <span className="text-sm font-medium text-slate-700">{field.name}</span>
                                                            {field.type === 'object' && <span className="text-[10px] text-slate-400">(Body)</span>}
                                                        </div>
                                                        {mapping && (
                                                            <button onClick={() => removeMapping(field.id)} className="text-slate-300 hover:text-red-500"><X size={14}/></button>
                                                        )}
                                                    </div>
                                                    {mapping && sourceInfo && (
                                                        <div className="mt-1 flex items-center gap-2 text-xs text-blue-600 bg-white/60 px-2 py-1.5 rounded border border-blue-100/50">
                                                            <sourceInfo.icon size={12} className={mapping.sourceType === 'upstream' ? 'text-indigo-500' : 'text-blue-500'} />
                                                            <span>
                                                                {mapping.sourceType === 'upstream' ? (
                                                                    <>From <b>{sourceInfo.top}</b> response: <code className="bg-indigo-50 px-1 rounded">{sourceInfo.val}</code></>
                                                                ) : (
                                                                    <>From Public Input: <b>{sourceInfo.val}</b></>
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {ep.requestFields.length === 0 && <div className="text-xs text-slate-400 italic px-2">No parameters required.</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    {publicEndpoint.method} {publicEndpoint.path}
                    <span className="text-slate-300">|</span>
                    <span className="text-base font-normal text-slate-600">{mode === 'response' ? 'Output Mapping' : 'Input Mapping'}</span>
                </h2>
            </div>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
                onClick={() => setMode('request')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'request' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Map Inputs
            </button>
            <button 
                onClick={() => setMode('response')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'response' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Map Outputs
            </button>
        </div>

        <button 
            onClick={save}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
            <Save size={18} />
            Save
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column (Source) */}
        <div className="w-1/2 border-r border-slate-200 flex flex-col bg-white">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    {mode === 'response' ? <Database size={18} /> : <ArrowRight size={18} />}
                    {mode === 'response' ? 'Source: Upstream Responses' : 'Select Source Type:'}
                </div>
                {mode === 'request' && (
                     <div className="flex text-xs font-medium bg-slate-100 p-1 rounded">
                        <button 
                            onClick={() => setRequestSourceType('public')}
                            className={`flex-1 py-1 rounded transition-all ${requestSourceType === 'public' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                        >
                            Public Inputs
                        </button>
                        <button 
                            onClick={() => setRequestSourceType('upstream')}
                            className={`flex-1 py-1 rounded transition-all ${requestSourceType === 'upstream' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                        >
                            Upstream Responses
                        </button>
                     </div>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
                {mode === 'response' ? (
                    /* Response Mode: Always Upstream Sources */
                    renderUpstreamSources()
                ) : (
                    /* Request Mode: Toggle between Public Input or Upstream Responses */
                    requestSourceType === 'public' ? (
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Available Public Inputs</h4>
                            {publicEndpoint.requestSchema.map(field => (
                                <div 
                                    key={field.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, 'source_public', { fieldId: field.id })}
                                    className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-md cursor-grab active:cursor-grabbing group transition-all"
                                >
                                    <GripHorizontal size={16} className="text-slate-300 group-hover:text-blue-400" />
                                    <div className="p-1.5 bg-blue-100 text-blue-700 rounded text-xs font-bold uppercase">{field.in?.substring(0,1)}</div>
                                    <div>
                                        <div className="font-bold text-slate-700">{field.name}</div>
                                        <div className="text-xs text-slate-400 font-mono">{field.type} ({field.in})</div>
                                    </div>
                                </div>
                            ))}
                            {publicEndpoint.requestSchema.length === 0 && <div className="text-slate-400 text-center italic mt-10">No public inputs defined.</div>}
                        </div>
                    ) : (
                        renderUpstreamSources()
                    )
                )}
            </div>
        </div>

        {/* Right Column (Target) */}
        <div className="w-1/2 flex flex-col bg-slate-50/50">
            <div className="p-4 bg-white border-b border-slate-200 font-semibold text-slate-700 flex items-center gap-2 shadow-sm">
                {mode === 'response' ? <ArrowRight size={18} /> : <Database size={18} />}
                {mode === 'response' ? 'Target: Public Response' : 'Target: Upstream Requests'}
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {mode === 'response' ? (
                     /* Response Mode: Targets are Public Response Fields */
                     publicEndpoint.responseSchema.map(field => {
                        const mapping = getResponseMapping(field.id);
                        const sourceInfo = mapping ? getSourceDisplay(mapping) : null;
                        return (
                            <div 
                                key={field.id}
                                onDragOver={e => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, field.id)}
                                className={`relative p-4 rounded-xl border-2 transition-all ${mapping ? 'bg-blue-50 border-blue-200' : 'bg-white border-dashed border-slate-300 hover:border-blue-300'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-blue-600 font-bold text-xs bg-blue-100 px-1.5 py-0.5 rounded">{field.type}</span>
                                        <span className="font-semibold text-slate-800">{field.name}</span>
                                    </div>
                                </div>
                                {mapping && sourceInfo && (
                                    <div className="mt-2 flex items-center gap-3 bg-white p-2 rounded border border-blue-100 shadow-sm">
                                        <sourceInfo.icon size={14} className="text-blue-500" />
                                        <div className="flex-1 text-xs">
                                            <span className="font-bold text-slate-700">{sourceInfo.top}</span> &rarr; <span className="font-mono text-slate-600">{sourceInfo.val}</span>
                                        </div>
                                        <button onClick={() => removeMapping(field.id)} className="text-slate-300 hover:text-red-500"><X size={14}/></button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    /* Request Mode: Targets are grouped by execution phase */
                    renderRequestFlow()
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default Mapper;