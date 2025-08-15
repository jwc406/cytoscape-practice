# Network Topology Demo

React + Vite + TypeScript + Cytoscape + ELK + Fastify Demo

## 실행

1. 의존성 설치

```bash
# 서버
cd server && npm install && cd ..
# 프론트
cd frontend && npm install && cd ..
# 루트 동시 실행 툴
npm install
```

2. 개발 서버 동시 실행

```bash
npm run dev:all
```

- Frontend: http://localhost:5173
- Server: http://localhost:5174

## 기능
- ELK 기반 계층 레이아웃 → Cytoscape 배치
- 링크 활용률/지연에 따른 스타일
- 미니맵/줌/팬, 박스 선택, 엣지 툴팁
- 우측 패널: 선택 정보, 경로 총 지연
- 실시간 메트릭/알람 WebSocket 스트림 (1s/5s)
- 알람 클릭 시 대상 하이라이트 & 카메라 이동
- 경로 추적 모드에서 두 노드 선택 시 최단 경로 하이라이트 및 지연 합산
- PNG/SVG 내보내기

환경변수: `VITE_SERVER_URL` (기본 http://localhost:5174)
