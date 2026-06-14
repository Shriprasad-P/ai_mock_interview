/**
 * Context7 API Integration
 * Fetches up-to-date library documentation for enhanced technical interview questions
 * 
 * API Docs: https://context7.com/docs/api-guide
 */

const CONTEXT7_BASE_URL = "https://context7.com/api/v2";

interface LibrarySearchResult {
  id: string;
  name: string;
  description: string;
  totalSnippets: number;
  trustScore: number;
  versions?: string[];
}

interface DocumentationSnippet {
  title: string;
  content: string;
  source: string;
}

/**
 * Search for a library by name to get its Context7 ID
 */
export async function searchLibrary(
  libraryName: string,
  query: string
): Promise<LibrarySearchResult[]> {
  const apiKey = process.env.CONTEXT7_API_KEY;
  
  if (!apiKey) {
    console.warn("Context7 API key not configured");
    return [];
  }

  try {
    const params = new URLSearchParams({
      libraryName,
      query,
    });

    const response = await fetch(`${CONTEXT7_BASE_URL}/libs/search?${params}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error("Context7 search failed:", response.status);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error("Context7 search error:", error);
    return [];
  }
}

/**
 * Get documentation context for a specific library
 */
export async function getDocumentation(
  libraryId: string,
  query: string
): Promise<DocumentationSnippet[]> {
  const apiKey = process.env.CONTEXT7_API_KEY;
  
  if (!apiKey) {
    console.warn("Context7 API key not configured");
    return [];
  }

  try {
    const params = new URLSearchParams({
      libraryId,
      query,
      type: "json",
    });

    const response = await fetch(`${CONTEXT7_BASE_URL}/context?${params}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error("Context7 docs fetch failed:", response.status);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error("Context7 docs error:", error);
    return [];
  }
}

/**
 * Map common interview topics to Context7 library names
 */
const topicToLibrary: Record<string, string> = {
  // Frontend
  "react": "react",
  "next.js": "next.js",
  "nextjs": "next.js",
  "vue": "vue",
  "angular": "angular",
  "typescript": "typescript",
  "javascript": "javascript",
  
  // Backend
  "node.js": "node.js",
  "nodejs": "node.js",
  "express": "express",
  "fastify": "fastify",
  "nest.js": "nestjs",
  "nestjs": "nestjs",
  
  // Databases
  "mongodb": "mongodb",
  "postgresql": "postgresql",
  "redis": "redis",
  "prisma": "prisma",
  
  // Cloud & DevOps
  "docker": "docker",
  "kubernetes": "kubernetes",
  "aws": "aws",
  
  // Python
  "python": "python",
  "django": "django",
  "flask": "flask",
  "fastapi": "fastapi",
  
  // Data
  "pandas": "pandas",
  "numpy": "numpy",
  "tensorflow": "tensorflow",
  "pytorch": "pytorch",
};

/**
 * Get library context for technical interview questions
 * Returns formatted documentation to enhance LLM prompts
 */
export async function getInterviewContext(
  focusAreas: string[],
  interviewType: string
): Promise<string> {
  // Only use Context7 for technical interviews
  const technicalTypes = ["Technical Coding", "System Design", "Technical HR"];
  if (!technicalTypes.includes(interviewType)) {
    return "";
  }

  const contexts: string[] = [];

  for (const area of focusAreas) {
    const normalizedArea = area.toLowerCase().trim();
    const libraryName = topicToLibrary[normalizedArea];
    
    if (!libraryName) continue;

    // Search for the library
    const libraries = await searchLibrary(libraryName, `${area} best practices`);
    if (libraries.length === 0) continue;

    // Get documentation for the best match
    const docs = await getDocumentation(
      libraries[0].id,
      `interview questions ${area} concepts`
    );

    if (docs.length > 0) {
      const snippets = docs.slice(0, 3).map(d => 
        `- ${d.title}: ${d.content.slice(0, 300)}...`
      ).join("\n");
      
      contexts.push(`\n### ${libraries[0].name} (Latest Docs)\n${snippets}`);
    }
  }

  if (contexts.length === 0) {
    return "";
  }

  return `
--- Context7: Up-to-date Library Documentation ---
Use these current patterns and APIs when creating interview questions:
${contexts.join("\n")}
--- End Context7 ---
`;
}
