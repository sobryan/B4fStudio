import React, { useState } from 'react';
import { Project, SupportedLanguage } from '../types';
import { generateBffCode } from '../services/geminiService';
import { Download, Play, Check, Loader2, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface CodeGeneratorProps {
  project: Project;
}

const CodeGenerator: React.FC<CodeGeneratorProps> = ({ project }) => {
  const [language, setLanguage] = useState<SupportedLanguage>('java');
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (project.publicEndpoints.length === 0) {
        alert("Please define at least one public endpoint first.");
        return;
    }
    setLoading(true);
    setCode(null);
    try {
      const result = await generateBffCode(project, language);
      setCode(result);
    } catch (e) {
      console.error(e);
      setCode("Error generating code. Please check your API Key and try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
      if(code) navigator.clipboard.writeText(code);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Code Generator</h2>
        <p className="text-slate-600">Transform your visual BFF design into production-ready source code using AI.</p>
      </div>

      <div className="flex gap-6 h-full overflow-hidden">
        {/* Configuration */}
        <div className="w-1/4 min-w-[300px] bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
          <h3 className="font-semibold text-lg mb-4 text-slate-800">Configuration</h3>
          
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Target Stack</label>
            <div className="space-y-2">
                {[
                    { id: 'java', label: 'Java 17 + Spring Boot 3' },
                    { id: 'php', label: 'PHP 8.2 API' },
                    { id: 'nextjs', label: 'Next.js App Router' },
                    { id: 'python', label: 'Python FastAPI' }
                ].map(opt => (
                    <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${language === opt.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300'}`}>
                        <input 
                            type="radio" 
                            name="language" 
                            value={opt.id} 
                            checked={language === opt.id}
                            onChange={() => setLanguage(opt.id as any)}
                            className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium text-sm">{opt.label}</span>
                    </label>
                ))}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 mb-6">
            <div className="text-xs text-slate-500 font-semibold uppercase mb-2">Project Summary</div>
            <div className="text-sm space-y-1">
                <div className="flex justify-between"><span>Endpoints:</span> <span className="font-bold">{project.publicEndpoints.length}</span></div>
                <div className="flex justify-between"><span>Upstreams:</span> <span className="font-bold">{project.upstreamApis.length}</span></div>
                <div className="flex justify-between"><span>Res Map:</span> <span className="font-bold">{project.responseMappings.length}</span></div>
                <div className="flex justify-between"><span>Req Map:</span> <span className="font-bold">{project.requestMappings.length}</span></div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg font-bold text-white shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all
                ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transform hover:-translate-y-0.5'}`}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
            {loading ? 'Generating...' : 'Generate Code'}
          </button>
        </div>

        {/* Output */}
        <div className="flex-1 bg-slate-900 rounded-xl shadow-lg border border-slate-800 flex flex-col overflow-hidden">
            <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="ml-2 text-xs text-slate-400 font-mono">generated_project.zip</span>
                </div>
                {code && (
                    <div className="flex gap-2">
                        <button onClick={copyToClipboard} className="text-slate-400 hover:text-white transition-colors" title="Copy">
                            <Copy size={18} />
                        </button>
                        <button className="text-slate-400 hover:text-white transition-colors" title="Download (Mock)">
                            <Download size={18} />
                        </button>
                    </div>
                )}
            </div>
            <div className="flex-1 p-6 overflow-auto font-mono text-sm text-slate-300">
                {code ? (
                    <div className="prose prose-invert max-w-none">
                         <ReactMarkdown 
                            components={{
                                code({node, inline, className, children, ...props}: any) {
                                    return !inline ? (
                                        <div className="bg-slate-950 p-4 rounded-md my-4 border border-slate-800">
                                            <code {...props} className={className}>
                                                {children}
                                            </code>
                                        </div>
                                    ) : (
                                        <code {...props} className="bg-slate-800 px-1 rounded text-blue-300">
                                            {children}
                                        </code>
                                    )
                                }
                            }}
                         >
                            {code}
                         </ReactMarkdown>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600">
                        <Code size={48} className="mb-4 opacity-50" />
                        <p>Select settings and click Generate to see the code.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

// Simple placeholder icon
const Code = ({ size, className }: { size: number, className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
);

export default CodeGenerator;