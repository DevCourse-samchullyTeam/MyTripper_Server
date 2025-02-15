// 필요한 모듈 가져오기
const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const cors = require("cors");
const bcrypt = require("bcrypt"); // 비밀번호 해싱을 위한 bcrypt 라이브러리
require("dotenv").config({ path: "./.env" }); // ✅ .env 파일 경로 명시적으로 설정

// Express 애플리케이션 생성
const app = express();
const port = 3000; // 서버가 실행될 포트 번호

// Supabase 클라이언트 설정
require("dotenv").config(); //환경변수 로드드
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
// ⚠️ 실제 서비스에서는 API 키를 .env 파일에 저장하세요!
const supabase = createClient(supabaseUrl, supabaseKey);

// 미들웨어 설정
app.use(
  cors({
    origin: "*",
    method: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization",
    credentials: true,
  })
); // CORS 설정 (프론트엔드와 통신 허용)
app.use(express.json()); // JSON 데이터를 처리할 수 있도록 설정
//-----------------------------------------------------------
app.get("/api/keys", (req, res) => {
  res.json({
    TOGETHER_API_KEY: process.env.TOGETHER_API_KEY_JH,
    GROQ_API_KEY: process.env.GROQ_API_KEY_JH,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY_JH,
    UNSPLASH_API_KEY: process.env.UNSPLASH_API_KEY_JH,
  });
});
//-----------------------------------------------------------
// 🟢 회원가입 API 엔드포인트
app.post("/signup", async (req, res) => {
  const { name, user_id, password, mbti } = req.body; // 요청에서 사용자 데이터 추출

  try {
    // 비밀번호를 해싱 (암호화)하여 저장
    const hashedPassword = await bcrypt.hash(password, 10); // 10은 해싱 강도 (높을수록 보안 강화)

    // Supabase 데이터베이스에 사용자 추가
    const { data, error } = await supabase
      .from("users")
      .insert([{ name, user_id, password: hashedPassword, mbti }]);

    if (error) {
      return res
        .status(400)
        .json({ message: "회원가입 실패", error: error.message });
    }

    res.status(200).json({ message: "회원가입 성공", data }); // 성공 응답 반환
  } catch (error) {
    res.status(500).json({ message: "서버 오류 발생", error: error.message });
  }
});

// 🟢 로그인 API 엔드포인트
app.post("/login", async (req, res) => {
  const { user_id, password } = req.body; // 요청에서 사용자 정보 추출

  try {
    // Supabase에서 해당 사용자 찾기
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", user_id)
      .single(); // 단일 결과 가져오기

    if (error || !data) {
      return res
        .status(400)
        .json({ message: "로그인 실패: 아이디가 존재하지 않습니다." });
    }

    // 입력된 비밀번호와 데이터베이스에 저장된 해싱된 비밀번호 비교
    const passwordMatch = await bcrypt.compare(password, data.password);
    if (!passwordMatch) {
      return res
        .status(400)
        .json({ message: "로그인 실패: 비밀번호가 일치하지 않습니다." });
    }

    res.status(200).json({ message: "로그인 성공", data }); // 성공 응답 반환
  } catch (error) {
    res.status(500).json({ message: "서버 오류 발생", error: error.message });
  }
});

// 마이페이지 내 정보 조회
app.get("/myinfo", async (req, res) => {
  const id = req.query.id;
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (!data || error) {
    return res.status(400).json({
      message: `내 정보 불러오기 실패 : ${id} 해당 유저의 정보가 없습니다.`,
    });
  }

  res.send(data);
});

// 마이페이지 내 정보 수정
app.put("/myinfo/modifiy", async (req, res) => {
  const userData = req.body;

  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userData.id)
      .single();

    if (!data || error) {
      return res.status(400).json({
        message: `내 정보 수정 실패 : ${userData.id} 해당 유저의 정보가 없습니다.`,
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    // 업데이트 객체 구성
    const updateData = {
      name: userData.name,
      mbti: userData.mbti,
      password: hashedPassword,
    };

    // 사용자 정보 업데이트 (특정 id의 레코드만 업데이트)
    const { data: updatedData, error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userData.id);

    if (updateError) {
      return res.status(400).json({
        message: `내 정보 수정 실패: ${userData.id} 유저 업데이트 오류가 발생했습니다.`,
      });
    }
    return res
      .status(200)
      .json({ message: "내 정보 수정 성공", data: updatedData });
  } catch (error) {
    return res.status(400).json({
      message: `내 정보 수정 실패: ${userData.id} 유저 업데이트 오류가 발생했습니다.`,
    });
  }
});

// 🟢 서버 실행
app.listen(port, () => {
  console.log(`✅ 서버가 실행 중: http://localhost:${port}`);
});
