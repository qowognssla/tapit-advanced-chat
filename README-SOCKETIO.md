# Vue Advanced Chat with Socket.IO Backend

이 프로젝트는 Firebase를 Socket.IO와 자체 데이터베이스(SQLite)로 대체한 Vue Advanced Chat 데모입니다.

## 주요 변경사항

1. **Firebase 제거**: 모든 Firebase 관련 코드와 의존성을 제거했습니다.
2. **Socket.IO 서버**: Express와 Socket.IO를 사용한 실시간 통신 서버를 구축했습니다.
3. **SQLite 데이터베이스**: 채팅 데이터를 저장하기 위한 로컬 SQLite 데이터베이스를 사용합니다.
4. **자체 인증**: 간단한 사용자명 기반 인증 시스템을 구현했습니다.
5. **파일 업로드**: 로컬 파일 시스템을 사용한 파일 업로드 기능을 구현했습니다.

## 프로젝트 구조

```
tapit-advanced-chat/
├── server/                    # 백엔드 서버
│   ├── index.js              # 메인 서버 파일
│   ├── db/
│   │   └── database.js       # SQLite 데이터베이스 모듈
│   ├── socket/
│   │   └── handlers.js       # Socket.IO 이벤트 핸들러
│   ├── routes/               # REST API 라우트
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── rooms.js
│   │   └── messages.js
│   └── middleware/
│       └── auth.js           # JWT 인증 미들웨어
├── demo/                     # 프론트엔드 데모
│   └── src/
│       ├── services/         # 새로운 서비스 레이어
│       │   ├── config.js
│       │   ├── socketService.js
│       │   ├── apiService.js
│       │   └── chatService.js
│       ├── App.vue           # 수정된 메인 앱 (로그인 추가)
│       └── ChatContainer.vue # 수정된 채팅 컨테이너
└── src/                      # Vue Advanced Chat 컴포넌트 소스

```

## 실행 방법

### 1. 백엔드 서버 실행

```bash
# 서버 디렉토리로 이동
cd server

# 의존성 설치 (이미 설치되어 있음)
npm install

# 서버 실행
npm start
```

서버는 http://localhost:3001 에서 실행됩니다.

### 2. 프론트엔드 실행

새 터미널을 열고:

```bash
# demo 디렉토리로 이동
cd demo

# 의존성 설치 (이미 설치되어 있음)
npm install

# 개발 서버 실행
npm run dev
```

프론트엔드는 http://localhost:5173 에서 실행됩니다.

## 사용 방법

1. 브라우저에서 http://localhost:5173 접속
2. 원하는 사용자명을 입력하거나 빠른 로그인 버튼(Luke, Leia, Yoda) 클릭
3. 로그인 후 채팅 시작

### 주요 기능

- **실시간 메시징**: Socket.IO를 통한 실시간 메시지 전송
- **채팅방 생성**: 다른 사용자와 1:1 또는 그룹 채팅방 생성
- **메시지 편집/삭제**: 자신이 보낸 메시지 편집 및 삭제
- **파일 업로드**: 이미지 및 파일 업로드 지원
- **이모지 반응**: 메시지에 이모지 반응 추가
- **타이핑 인디케이터**: 상대방이 입력 중일 때 표시
- **온라인 상태**: 사용자의 온라인/오프라인 상태 표시

### 데모 사용자

빠른 테스트를 위해 3명의 데모 사용자가 제공됩니다:
- Luke
- Leia  
- Yoda

여러 브라우저 탭이나 시크릿 모드를 사용하여 다른 사용자로 로그인하여 채팅을 테스트할 수 있습니다.

## 기술 스택

### 백엔드
- Node.js
- Express
- Socket.IO
- SQLite3
- JWT (인증)
- Multer (파일 업로드)

### 프론트엔드
- Vue 3
- Socket.IO Client
- Axios
- Vue Advanced Chat 컴포넌트

## 데이터베이스 스키마

SQLite 데이터베이스에는 다음 테이블들이 있습니다:
- `users`: 사용자 정보
- `rooms`: 채팅방 정보
- `room_users`: 채팅방-사용자 연결
- `messages`: 메시지
- `message_files`: 메시지 첨부 파일
- `message_reactions`: 메시지 반응
- `typing_users`: 타이핑 상태

## 환경 변수

서버는 다음 환경 변수를 사용합니다 (기본값 제공):
- `PORT`: 서버 포트 (기본: 3001)
- `JWT_SECRET`: JWT 시크릿 키 (프로덕션에서는 변경 필요)
- `DATABASE_PATH`: SQLite 데이터베이스 경로

## 주의사항

- 이것은 데모 애플리케이션입니다. 프로덕션 사용을 위해서는 추가적인 보안 및 성능 최적화가 필요합니다.
- SQLite는 개발 및 테스트 목적으로 사용됩니다. 대규모 프로덕션 환경에서는 PostgreSQL이나 MySQL 같은 데이터베이스를 권장합니다.
- 업로드된 파일은 서버의 `uploads` 디렉토리에 저장됩니다. 프로덕션에서는 클라우드 스토리지 사용을 권장합니다.







