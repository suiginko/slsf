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

// Gemini AI Word Generation Endpoint
app.post("/api/generate-words", async (req, res) => {
  try {
    const { topic = "中国传统文化与现代科技", count = 25 } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: "未配置 GEMINI_API_KEY 环境变量，请在设置中配置或使用内置精选词库与自定义词表。",
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `你是一个专业的中文猜词游戏“随蓝射覆”出题专家。
请根据主题【${topic}】，生成恰好 ${count} 个富有趣味、雅俗共赏、长度各异的中文词语（字数2字到6字不等，包括成语、专有名词、日常词汇、文学典故、科技生活等）。
对于每个词语，请提供：
1. word: 中文词语本体（不含空格或标点）
2. hint: 简明而富有启发的出题线索/释义提示（15-40字，供主持人和提示使用）
3. category: 词语所属细分标签

请务必以合法的 JSON 数组格式返回，格式如下：
[
  { "word": "向日葵", "hint": "一种向阳而生的金色菊科草本植物，亦称朝阳花", "category": "自然植物" },
  ...
]
仅输出 JSON 字符串，不要添加 markdown 代码块外的解释。`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "[]";
    let wordsData = [];
    try {
      wordsData = JSON.parse(text);
    } catch {
      const match = text.match(/\[.*\]/s);
      if (match) {
        wordsData = JSON.parse(match[0]);
      }
    }

    if (!Array.isArray(wordsData) || wordsData.length === 0) {
      throw new Error("未能生成有效词语列表");
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
