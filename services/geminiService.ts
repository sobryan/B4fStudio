import { GoogleGenAI } from "@google/genai";
import { Project, SupportedLanguage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateBffCode = async (
  project: Project,
  language: SupportedLanguage
): Promise<string> => {
  const modelId = "gemini-3-pro-preview";

  const prompt = `
    You are an expert Senior Backend Engineer specializing in Backend-for-Frontend (BFF) architectures.
    
    Your task is to generate production-ready code for a BFF application based on the following configuration.
    
    TARGET LANGUAGE/FRAMEWORK: ${language.toUpperCase()}
    
    SPECIFIC FRAMEWORK REQUIREMENTS:
    - Java: Java 17, Spring Boot 3, Gradle. Use WebClient for HTTP requests. Use Spring Security + JWT.
    - PHP: Modern PHP 8.2+, standard structure (e.g., Slim Framework or Laravel). Use firebase/php-jwt.
    - Next.js: TypeScript, App Router. Use NextAuth.js or custom JWT utility.
    - Python: FastAPI, Pydantic, async/await with httpx. Use PyJWT.

    PROJECT CONFIGURATION (JSON):
    ${JSON.stringify(project, null, 2)}

    INSTRUCTIONS:
    1. **Public Endpoints & Input Binding**: 
       - Create controllers/handlers for 'publicEndpoints'.
       - Inspect 'requestSchema' to define expected inputs.
    
    2. **Security & Authentication (New)**:
       - Check 'securityConfig.enabled'.
       - If ENABLED:
         - Implement a \`/login\` public endpoint in the BFF.
         - This login endpoint must call the Upstream API defined by 'authApiId' and 'authEndpointId' using the credentials provided by the user.
         - Upon successful upstream response, generate a JWT.
         - Populate the JWT claims based on 'claimsMapping'. You must extract the values from the Upstream API response JSON using the 'sourceFieldPath' and put them into the JWT under 'claimName'.
         - Secure all other public endpoints. Require the JWT in the Authorization header (Bearer schema). Validate signature and expiration.
    
    3. **Dependency Resolution & Chaining**:
       - Analyze 'requestMappings'. 
       - If 'sourceType' is 'upstream', generate chained logic: call Upstream A, get result, call Upstream B.
       - Sort calls topologically.
       
    4. **Aggregation & Response**:
       - Execute upstream calls. 
       - Use 'responseMappings' to construct final response.
    
    5. **Output Format**:
       - Provide the output as a single markdown formatted string with multiple file blocks. 
       - Use standard filenames.
       - Include build/dependency files (pom.xml, package.json, requirements.txt) with necessary Security libraries included.
    
    Make the code robust. Handle 404s and 401s gracefully.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2048 },
      }
    });

    return response.text || "No code generated.";
  } catch (error) {
    console.error("Gemini generation error:", error);
    return `Error generating code: ${error instanceof Error ? error.message : String(error)}`;
  }
};