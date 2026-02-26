import { guardarPromptTool } from "./guardarPromptTool";
import { quickCommitCommitTool, quickCommitGetChangesTool } from "./quickCommitTool";
import { Tool } from "./types";

export const tools: Tool[] = [
	guardarPromptTool,
	quickCommitGetChangesTool,
	quickCommitCommitTool,
];
