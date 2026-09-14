import express from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Server as SocketIOServer } from "socket.io";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { OnlineGameManager } from "./server/onlineGameManager";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3100;

app.use(express.json({ limit: "5mb" }));

// 初始化在线联机对战管理器
const onlineManager = new OnlineGameManager(io);
io.on("connection", (socket) => {
  onlineManager.registerEvents(socket);
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "随蓝射覆", online: "ready" });
});

// AI Word Generation Endpoint supporting Domestic Free APIs (Zhipu GLM-4-Flash, SiliconFlow) and Gemini
app.post("/api/generate-words", async (req, res) => {
  try {
    const { topic = "中国传统文化与现代科技", count = 25, apiKey: clientApiKey, provider: clientProvider } = req.body;
    
    // 优先级：请求体传入Key > 环境变量
    const zhipuKey = clientProvider === 'zhipu' ? clientApiKey : (process.env.ZHIPU_API_KEY || (clientApiKey && clientApiKey.includes('.') ? clientApiKey : ''));
    const siliconKey = clientProvider === 'siliconflow' ? clientApiKey : (process.env.SILICONFLOW_API_KEY || '');
    const geminiKey = process.env.GEMINI_API_KEY || (clientApiKey && clientApiKey.startsWith('AIza') ? clientApiKey : '');
    const generalApiKey = clientApiKey || process.env.OPENAI_API_KEY;

    const prompt = `你是一个专业的中文猜词游戏“随蓝射覆”出题专家。
请根据主题【${topic}】，生成恰好 ${count} 个富有趣味、雅俗共赏、长度各异的中文词语（字数2字到6字不等，包括成语、专有名词、日常词汇、文学典故、科技生活等）。
对于每个词语，请提供：
1. word: 中文词语本体（不含空格或标点）
2. hint: 简明而富有启发的出题线索/释义提示（15-40字）
3. category: 词语所属细分标签

请务必以合法的 JSON 数组格式返回，格式如下：
[
  { "word": "向日葵", "hint": "一种向阳而生的金色菊科草本植物，亦称朝阳花", "category": "自然植物" },
  ...
]
仅输出纯 JSON 数组，严禁包含任何 markdown 代码块格式标记（不要使用 \`\`\`json 等标记）。`;

    let textResponse = "";

    // 1. 优先尝试智谱 GLM-4-Flash (国内直连完全免费免翻墙)
    if (zhipuKey) {
      const resp = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${zhipuKey}`,
        },
        body: JSON.stringify({
          model: "glm-4-flash",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`智谱 API 调用失败: ${resp.status} - ${errText}`);
      }

      const data: any = await resp.json();
      textResponse = data.choices?.[0]?.message?.content || "[]";
    }
    // 2. 尝试硅基流动 / OpenAI 兼容接口 (国内直连)
    else if (siliconKey || (generalApiKey && !geminiKey)) {
      const endpoint = siliconKey
        ? "https://api.siliconflow.cn/v1/chat/completions"
        : (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions");
      const model = siliconKey ? "Qwen/Qwen2.5-7B-Instruct" : (process.env.OPENAI_MODEL || "gpt-3.5-turbo");

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${siliconKey || generalApiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`AI 接口调用失败: ${resp.status} - ${errText}`);
      }

      const data: any = await resp.json();
      textResponse = data.choices?.[0]?.message?.content || "[]";
    }
    // 3. 尝试 Google Gemini (需境外或中转)
    else if (geminiKey) {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });
      textResponse = response.text || "[]";
    } else {
      return res.status(400).json({
        error: "未配置大模型 API Key。推荐使用国内完全免费的【智谱 GLM-4-Flash】(open.bigmodel.cn 无需翻墙)，或在输入框中填入 Key。",
      });
    }

    // 清洗提取 JSON
    let cleanJson = textResponse.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    let wordsData = [];
    try {
      wordsData = JSON.parse(cleanJson);
    } catch {
      const match = textResponse.match(/\[[\s\S]*\]/);
      if (match) {
        wordsData = JSON.parse(match[0]);
      }
    }

    if (!Array.isArray(wordsData) || wordsData.length === 0) {
      throw new Error("未能成功解析生成的词语列表，请重试。");
    }

    res.json({ success: true, words: wordsData });
  } catch (error: any) {
    console.error("Generate words error:", error);
    res.status(500).json({
      error: error.message || "生成词语失败，请稍后重试或使用自定义词表。",
    });
  }
});

async function startServer() {
  const isProd =
    process.env.NODE_ENV === "production" ||
    process.argv[1]?.endsWith(".cjs") ||
    process.argv[1]?.endsWith(".js");

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT} with Socket.IO online battle support`);
  });
}

startServer();
