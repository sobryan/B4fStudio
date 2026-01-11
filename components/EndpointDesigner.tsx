import React, { useState } from 'react';
import { Endpoint, Field } from '../types';
import { Plus, Trash2, Globe, Settings, ArrowRight } from 'lucide-react';

interface EndpointDesignerProps {
  endpoints: Endpoint[];
  onAddEndpoint: (ep: Endpoint) => void;
  onRemoveEndpoint: (id: string) => void;
  onSelectEndpoint: (ep: Endpoint) => void;
}

const EndpointDesigner: React.FC<EndpointDesignerProps> = ({ endpoints, onAddEndpoint, onRemoveEndpoint, onSelectEndpoint }) => {
  const [newPath, setNewPath] = useState('/books/details');
  const [newMethod, setNewMethod] = useState<'GET' | 'POST'>('GET');
  
  // Public Inputs
  const [requestFields, setRequestFields] = useState<Field[]>([
      { id: 'req_1', name: 'isbn', type: 'string', in: 'query' }
  ]);
  
  // Public Outputs
  const [responseFields, setResponseFields] = useState<Field[]>([
      { id: 'res_1', name: 'isbn', type: 'string' },
      { id: 'res_2', name: 'title', type: 'string' },
      { id: 'res_3', name: 'authorName', type: 'string' }
  ]);

  // Field Form State
  const [activeTab, setActiveTab] = useState<'request' | 'response'>('response');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<Field['type']>('string');
  const [newFieldIn, setNewFieldIn] = useState<Field['in']>('query');

  const handleAddEndpoint = () => {
    if (!newPath) return;
    const newEndpoint: Endpoint = {
      id: crypto.randomUUID(),
      path: newPath,
      method: newMethod,
      description: `Public ${newMethod} endpoint for ${newPath}`,
      requestSchema: [...requestFields],
      responseSchema: [...responseFields]
    };
    onAddEndpoint(newEndpoint);
  };

  const addField = () => {
      if(!newFieldName) return;
      const newField: Field = { 
          id: crypto.randomUUID(), 
          name: newFieldName, 
          type: newFieldType,
          in: activeTab === 'request' ? newFieldIn : undefined
      };
      
      if (activeTab === 'request') {
          setRequestFields([...requestFields, newField]);
      } else {
          setResponseFields([...responseFields, newField]);
      }
      setNewFieldName('');
  };

  const removeField = (id: string, type: 'request' | 'response') => {
      if (type === 'request') {
          setRequestFields(requestFields.filter(f => f.id !== id));
      } else {
          setResponseFields(responseFields.filter(f => f.id !== id));
      }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto h-full overflow-hidden flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Public Endpoints</h2>
        <p className="text-slate-600">Design the REST endpoints your BFF will expose. Define both input parameters and output structure.</p>
      </div>

      <div className="flex gap-8 flex-1 overflow-hidden">
        {/* Creation Form */}
        <div className="w-1/3 bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-y-auto flex flex-col">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <Plus size={20} className="text-blue-500" />
            New Endpoint
          </h3>
          
          <div className="space-y-4 mb-6">
            <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">HTTP Method</label>
                <select 
                    value={newMethod} 
                    onChange={e => setNewMethod(e.target.value as any)}
                    className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-50"
                >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Path</label>
                <input 
                    type="text" 
                    value={newPath}
                    onChange={e => setNewPath(e.target.value)}
                    className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-50 font-mono"
                    placeholder="/api/resource"
                />
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
             <div className="flex border-b border-slate-200 mb-4">
                 <button 
                    onClick={() => setActiveTab('request')}
                    className={`pb-2 px-4 text-sm font-medium transition-colors ${activeTab === 'request' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                 >
                    Input Config
                 </button>
                 <button 
                    onClick={() => setActiveTab('response')}
                    className={`pb-2 px-4 text-sm font-medium transition-colors ${activeTab === 'response' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                 >
                    Output Config
                 </button>
             </div>

             <div className="flex-1 overflow-y-auto mb-4">
                 <div className="space-y-2">
                    {(activeTab === 'request' ? requestFields : responseFields).map(field => (
                        <div key={field.id} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100">
                            <div className="flex items-center gap-2 overflow-hidden">
                                {activeTab === 'request' && (
                                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200 px-1 rounded">{field.in}</span>
                                )}
                                <span className="text-blue-600 font-mono text-xs font-bold">{field.type}</span>
                                <span className="text-sm font-medium truncate">{field.name}</span>
                            </div>
                            <button onClick={() => removeField(field.id, activeTab)} className="text-slate-400 hover:text-red-500">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    {(activeTab === 'request' ? requestFields : responseFields).length === 0 && (
                        <div className="text-xs text-slate-400 text-center py-4 italic">No fields defined.</div>
                    )}
                 </div>
             </div>
             
             <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Add {activeTab} Field</div>
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Name" 
                            className="flex-1 border border-slate-200 rounded p-1.5 text-sm"
                            value={newFieldName}
                            onChange={e => setNewFieldName(e.target.value)}
                        />
                        <select 
                            className="w-24 border border-slate-200 rounded p-1.5 text-sm"
                            value={newFieldType}
                            onChange={e => setNewFieldType(e.target.value as any)}
                        >
                            <option value="string">String</option>
                            <option value="number">Num</option>
                            <option value="boolean">Bool</option>
                            <option value="object">Obj</option>
                        </select>
                    </div>
                    {activeTab === 'request' && (
                        <select 
                            className="w-full border border-slate-200 rounded p-1.5 text-sm"
                            value={newFieldIn}
                            onChange={e => setNewFieldIn(e.target.value as any)}
                        >
                            <option value="query">Query Param</option>
                            <option value="path">Path Variable</option>
                            <option value="body">Request Body</option>
                            <option value="header">Header</option>
                        </select>
                    )}
                    <button onClick={addField} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-1.5 rounded text-sm font-medium">
                        Add Field
                    </button>
                </div>
             </div>
          </div>

          <button 
            onClick={handleAddEndpoint}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
          >
            Create Endpoint
          </button>
        </div>

        {/* Existing Endpoints List */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 content-start overflow-y-auto pb-10">
            {endpoints.map(ep => (
                <div key={ep.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative group h-fit">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                             <span className={`px-2 py-1 rounded text-xs font-bold 
                                    ${ep.method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {ep.method}
                             </span>
                             <span className="font-mono text-sm font-semibold text-slate-700">{ep.path}</span>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => onSelectEndpoint(ep)}
                                className="text-indigo-500 hover:bg-indigo-50 p-1.5 rounded transition-colors"
                                title="Map Data"
                            >
                                <Settings size={18} />
                            </button>
                            <button 
                                onClick={() => onRemoveEndpoint(ep.id)}
                                className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 rounded p-3 border border-slate-100">
                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">Input</div>
                            <div className="space-y-1">
                                {ep.requestSchema.map(field => (
                                    <div key={field.id} className="flex items-center gap-1 text-xs text-slate-600">
                                        <span className="text-[10px] bg-slate-200 px-1 rounded text-slate-500">{field.in && field.in[0]}</span>
                                        <span>{field.name}</span>
                                    </div>
                                ))}
                                {ep.requestSchema.length === 0 && <span className="text-xs text-slate-400 italic">None</span>}
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded p-3 border border-slate-100">
                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">Output</div>
                            <div className="space-y-1">
                                {ep.responseSchema.map(field => (
                                    <div key={field.id} className="flex items-center gap-1 text-xs text-slate-600">
                                        <span className="font-mono text-blue-500">{field.type.substring(0,3)}</span>
                                        <span>{field.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button 
                            onClick={() => onSelectEndpoint(ep)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                            Configure Mapping <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            ))}
            
            {endpoints.length === 0 && (
                <div className="col-span-2 flex flex-col items-center justify-center p-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    <Globe size={48} className="mb-4 opacity-50" />
                    <p>No endpoints configured. Create one to get started.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default EndpointDesigner;