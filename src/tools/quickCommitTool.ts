import { execFile } from "child_process";
import { promisify } from "util";
import type { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";

const execFileAsync = promisify(execFile);

const MAX_SNIPPET_FILES = 5;
const MAX_SNIPPET_LINES = 20;

const ensureGitRepo = async (cwd: string) => {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--is-inside-work-tree"], { cwd });
    return stdout.trim() === "true";
  } catch {
    return false;
  }
};

const sanitizeCommitMessage = (message: string) => {
  return message.replace(/\r?\n/g, " ").trim();
};

const uniqueFiles = (files: string[]) => {
  const set = new Set(files.filter(Boolean));
  return Array.from(set);
};

const detectChangeType = (files: string[]) => {
  const joined = files.join(" ");
  if (files.includes("package.json") || files.includes("package-lock.json")) return "dependencies";
  if (/\.(js|ts|tsx|jsx|py|java|cs|go|rs|cpp|c|kt|swift)$/i.test(joined)) return "code";
  if (/\.(md|txt|rst)$/i.test(joined)) return "docs";
  if (/\.(css|scss|less|sass)$/i.test(joined)) return "styles";
  return "general";
};

const getDiffForFile = async (cwd: string, file: string) => {
  const { stdout: unstaged } = await execFileAsync("git", ["diff", "--unified=5", file], { cwd });
  if (unstaged.trim()) return unstaged;

  const { stdout: staged } = await execFileAsync("git", ["diff", "--unified=5", "--cached", file], { cwd });
  return staged;
};

const buildSnippets = async (cwd: string, files: string[]) => {
  const targetFiles = files.slice(0, MAX_SNIPPET_FILES);
  const snippets: Array<{ file: string; diff: string }> = [];

  for (const file of targetFiles) {
    try {
      const diff = await getDiffForFile(cwd, file);
      if (!diff.trim()) {
        continue;
      }
      const limited = diff.split("\n").slice(0, MAX_SNIPPET_LINES).join("\n");
      snippets.push({ file, diff: limited });
    } catch {
      // ignore per-file errors to keep the tool responsive
    }
  }

  return snippets;
};

const getChangesSummary = async () => {
  const cwd = process.cwd();
  const isRepo = await ensureGitRepo(cwd);
  if (!isRepo) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: "❌ No se encontró un repositorio Git en el directorio actual.",
        },
      ],
    };
  }

  const [{ stdout: status }, { stdout: diffStat }, { stdout: diffStatCached }, { stdout: filesUnstaged }, { stdout: filesStaged }] =
    await Promise.all([
      execFileAsync("git", ["status", "--porcelain"], { cwd }),
      execFileAsync("git", ["diff", "--stat"], { cwd }),
      execFileAsync("git", ["diff", "--stat", "--cached"], { cwd }),
      execFileAsync("git", ["diff", "--name-only"], { cwd }),
      execFileAsync("git", ["diff", "--name-only", "--cached"], { cwd }),
    ]);

  const files = uniqueFiles([
    ...filesUnstaged.split("\n").map((f) => f.trim()),
    ...filesStaged.split("\n").map((f) => f.trim()),
  ]);

  const snippets = await buildSnippets(cwd, files);
  const stats = ["# Unstaged", diffStat.trim(), "# Staged", diffStatCached.trim()]
    .filter((line) => line.length > 0)
    .join("\n");

  const changes = {
    files,
    stats,
    status,
    count: files.length,
    type: detectChangeType(files),
    snippets,
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(changes, null, 2),
      },
    ],
  };
};

const commitChanges = async (request: CallToolRequest) => {
  const cwd = process.cwd();
  const isRepo = await ensureGitRepo(cwd);
  if (!isRepo) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: "❌ No se encontró un repositorio Git en el directorio actual.",
        },
      ],
    };
  }

  const args = request.params.arguments as { message?: string };
  const rawMessage = args?.message ?? "";
  const message = sanitizeCommitMessage(rawMessage);

  if (!message) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: "❌ El mensaje de commit está vacío o es inválido.",
        },
      ],
    };
  }

  try {
    console.log("⚡ Ejecutando quick commit...");
    await execFileAsync("git", ["add", "."], { cwd });
    await execFileAsync("git", ["commit", "-m", message], { cwd });

    return {
      content: [
        {
          type: "text",
          text: "✅ Commit ejecutado correctamente.",
        },
      ],
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `❌ Error ejecutando el commit: ${(error as Error).message}`,
        },
      ],
    };
  }
};

const quickCommitGetChangesImpl = async () => {
  return getChangesSummary();
};

export const quickCommitGetChangesTool = Object.assign(quickCommitGetChangesImpl, {
  metadata: {
    name: "quick-commit:get_changes",
    description: "Obtiene un resumen local y rápido de cambios en Git.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
});

const quickCommitCommitImpl = async (request: CallToolRequest) => {
  return commitChanges(request);
};

export const quickCommitCommitTool = Object.assign(quickCommitCommitImpl, {
  metadata: {
    name: "quick-commit:commit",
    description: "Ejecuta git add . y git commit -m con el mensaje provisto.",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Mensaje de commit ya generado por Copilot.",
        },
      },
      required: ["message"],
    },
  },
});
