import { diagrams } from './diagrams.js';

export const templateConfig = {
    system: {
        documentTitle: 'Yohan | Realtime Auction Problem Solving Portfolio',
        systemName: 'REALTIME_AUCTION_PROBLEM_SOLVING_V.1.0'
    },

    hero: {
        sectionId: 'realtime-auction-problem-solving',
        panelTitle: 'REALTIME_AUCTION_PROBLEM_SOLVING_OVERVIEW',
        panelUid: 'ID: RT-AUC-PS-00',
        diagramId: 'realtime-auction-problem-overview',
        metrics: [
            '이력서 Realtime Auction 항목을 코드 단위로 추적해 문제-원인-해결-결과 흐름으로 재구성했습니다.',
            '핵심 근거는 auction/consumers.py, payment/views.py, product/filters.py, config/settings.py, auction/middlewares.py 입니다.',
            '결제 워크플로우는 프론트 제약 환경에서의 ready/approval 상태 연결과 만료 정리 정책을 중심으로 설명했습니다.',
            '각 케이스 상단 다이어그램은 실행 흐름 또는 before/after 관점으로 바로 이해할 수 있게 구성했습니다.'
        ]
    },

    topPanels: [
        {
            sectionId: 'realtime-auction-code-evidence',
            panelTitle: 'CODE_EVIDENCE_MAP',
            panelUid: 'ID: RT-AUC-PS-01',
            diagramId: 'realtime-auction-code-evidence-map',
            navLabel: 'CODE_EVIDENCE',
            metrics: [
                'Realtime Bid: auction/consumers.py + auction/models.py + auction/routing.py',
                'Payment Flow: payment/views.py + payment/payment_platform/kakao_pay.py + payment/tasks.py',
                'Search and Modeling: product/views.py + product/filters.py + product/models.py',
                'Automation and Security: config/settings.py + auction/tasks.py + chat/tasks.py + auction/middlewares.py'
            ]
        }
    ],

    navigation: [
        { label: 'REALTIME_AUCTION_PROBLEM_SOLVING_OVERVIEW', target: '#realtime-auction-problem-solving' },
        { label: 'CASES', target: '#realtime-auction-cases' },
        { label: 'CODE_EVIDENCE', target: '#realtime-auction-code-evidence' },
        { label: 'SKILL_SET', target: '#realtime-auction-skill-set' },
        { label: 'CONTACT', target: '#contact' }
    ],

    skills: {
        sectionId: 'realtime-auction-skill-set',
        panelTitle: 'SKILL_SET',
        panelUid: 'ID: RT-AUC-STACK',
        items: [
            { title: 'REALTIME', stack: 'Django Channels, AsyncWebsocketConsumer, Group Messaging' },
            { title: 'ASYNC OPS', stack: 'Celery, Celery Beat, Redis Broker, Periodic Tasks' },
            { title: 'PAYMENT', stack: 'KakaoPay ready/approval, winner payment lifecycle, timeout cleanup' },
            { title: 'QUERY DESIGN', stack: 'django-filter, icontains search, pagination, category filtering' },
            { title: 'DATA MODEL', stack: 'django-mptt tree category, ProductImages, AuctionRoom state fields' },
            { title: 'SECURITY', stack: 'SimpleJWT, WebSocket JWT middleware, authenticated room access' }
        ]
    },

    serviceSections: [
        {
            id: 'realtime-auction-cases',
            title: 'REALTIME_AUCTION_TROUBLESHOOTING_CASES',
            navLabel: 'CASES',
            theme: 'blue',
            cardVisualHeight: '280px',
            cardClass: 'problem-case-card',
            groups: [
                {
                    title: 'REALTIME BIDDING / PAYMENT',
                    desc: '입찰 정합성, 결제 상태 브릿지와 만료 처리',
                    cards: [
                        {
                            mermaidId: 'case-bid-concurrency-guard',
                            anchorId: 'realtime-auction-case-1',
                            title: 'Case 1. 실시간 입찰 동시성 정합성 가드',
                            subtitle: '2023-09 · AuctionConsumer 비동기 경계 정리',
                            overview: '동시 입찰 환경에서 최고가/낙찰자 갱신 충돌을 줄이기 위해\n입찰 저장과 최고가 갱신 경로를 분리한 케이스입니다.',
                            role: '입찰 처리 흐름 설계, 최고가 업데이트 조건 정리, WebSocket 브로드캐스트 구조 정비',
                            stackSummary: 'Django Channels, database_sync_to_async, AuctionRoom, AuctionMessage',
                            problem: '1) 여러 사용자가 동시에 bid 이벤트를 전송하면 최고가 갱신 시점이 겹칠 수 있습니다.\n2) 메시지 저장과 최고가 반영이 분리되지 않으면 낮은 가격 업데이트가 섞일 위험이 있습니다.',
                            solution: '1) `AuctionConsumer.receive`에서 `bid_price` 이벤트를 별도 분기로 처리했습니다.\n2) `create_or_update_auction_message`로 사용자별 입찰 이력 저장/갱신을 먼저 수행했습니다.\n3) `update_max_price`에서 현재 최종가와 비교 후 더 큰 값만 반영하도록 제한했습니다.\n4) 최고가가 갱신된 경우에만 `group_send`로 실시간 브로드캐스트를 전송했습니다.',
                            result: '1) 동시 입찰에서도 최고가/낙찰자 갱신 경로가 명확해졌습니다.\n2) 불필요한 브로드캐스트가 줄고, 클라이언트가 받는 상태가 일관되게 유지됩니다.',
                            skills: ['Realtime Bidding', 'Concurrency Guard', 'Channels', 'Async Boundary'],
                            highlights: [
                                'Bid event path split from generic chat message path',
                                'Message upsert executed before max-price mutation',
                                'Max-price update uses strict greater-than check',
                                'Broadcast only when highest bid actually changes'
                            ],
                            links: [
                                { label: 'CODE_AUCTION_CONSUMER', href: 'https://github.com/ramyo564/realtime_auction/blob/develop/auction/consumers.py' },
                                { label: 'CODE_AUCTION_MODELS', href: 'https://github.com/ramyo564/realtime_auction/blob/develop/auction/models.py' },
                                { label: 'CODE_AUCTION_ROUTING', href: 'https://github.com/ramyo564/realtime_auction/blob/develop/auction/routing.py' },
                                { label: 'DOC_CONTEXT', href: 'https://github.com/ramyo564/realtime_auction/blob/develop/Readme.md' }
                            ]
                        },
                        {
                            mermaidId: 'case-payment-state-bridge',
                            anchorId: 'realtime-auction-case-2',
                            title: 'Case 2. 카카오페이 ready/approval 상태 브릿지 안정화',
                            subtitle: '2023-10 ~ 2023-11 · Payment Flow 구현',
                            overview: '프론트 세션/쿠키가 없는 제약 환경에서\nready -> approval 상태 연결과 미완료 결제 정리를 구현한 케이스입니다.',
                            role: 'KakaoPay ready/approval API 구현, 임시 상태 매핑, 결제 만료 정리 로직 구성',
                            stackSummary: 'DRF APIView, KakaoPay REST, Celery Task, Payments model',
                            problem: '1) 카카오페이는 ready 단계의 `tid`를 approval에서 다시 사용해야 합니다.\n2) 프론트 세션 경계가 없는 환경에서는 사용자 결제 상태를 안전하게 이어붙이기 어렵습니다.\n3) 미완료 결제가 누적되면 운영 데이터 품질이 떨어집니다.',
                            solution: '1) `KakaoPayReady`에서 사용자 키 기반 `PAYMENT_DIC`로 임시 paymentId를 연결했습니다.\n2) `kakao_pay_ready` 처리 시 `Payments`에 `kakao_tid`, `kakao_pay_url`을 저장해 승인 단계 기준점을 만들었습니다.\n3) `KakaoPayApprovalView`에서 저장된 키/결제정보를 조회해 승인 요청을 수행했습니다.\n4) `WinningdBidListView`에서 미결제 건 만료 시간을 비교해 expired 데이터 정리 로직을 적용했습니다.',
                            result: '1) ready/approval 단계 사이 상태 단절이 줄고 결제 진행 경로가 안정화되었습니다.\n2) 결제 만료 데이터 누적을 완화해 운영 데이터 정리 비용을 낮췄습니다.',
                            skills: ['Payment Integration', 'State Bridge', 'KakaoPay', 'Data Cleanup'],
                            highlights: [
                                'User-keyed temporary map bridges ready and approval calls',
                                'Payment row persists kakao_tid and redirect URL context',
                                'Approval path resolves pending payment using stored key',
                                'Expired unpaid payments are periodically cleaned on list access'
                            ],
                            links: [
                                { label: 'CODE_PAYMENT_VIEWS', href: 'https://github.com/ramyo564/realtime_auction/blob/develop/payment/views.py' },
                                { label: 'CODE_KAKAO_PAY', href: 'https://github.com/ramyo564/realtime_auction/blob/develop/payment/payment_platform/kakao_pay.py' },
                                { label: 'CODE_PAYMENT_TASK', href: 'https://github.com/ramyo564/realtime_auction/blob/develop/payment/tasks.py' },
                                { label: 'CODE_PAYMENT_MODEL', href: 'https://github.com/ramyo564/realtime_auction/blob/develop/payment/models.py' }
                            ]
                        }
                    ]
                },
                {
                    title: 'SEARCH / DOMAIN MODEL',
                    desc: '검색 필터 표준화와 경매 생명주기 자동화',
                    cards: [
                        {
                            mermaidId: 'case-search-mptt-standardization',
                            anchorId: 'realtime-auction-case-3',
                            title: 'Case 3. 검색 필터 + MPTT 카테고리 구조 표준화',
                            subtitle: '2023-09 · Product 조회 경로 개선',
                            overview: '상품 탐색 API에서 키워드/카테고리 조합 검색을 표준화하고\n계층형 카테고리 모델을 적용한 케이스입니다.',
                            role: '필터 설계, 카테고리 모델 리팩터링, 페이지네이션 응답 정리',
                            stackSummary: 'django-filter, CharFilter(icontains), django-mptt, PageNumberPagination',
                            problem: '1) 단순 조회 방식은 조건 조합이 늘수록 분기와 유지비가 커집니다.\n2) 다단계 카테고리를 일반 테이블로 다루면 상/하위 조회 로직이 복잡해집니다.',
                            solution: '1) `ProductsView`에서 `ProductsFilter`를 검색 진입점으로 통일했습니다.\n2) `keyword`, `category__category_name`에 `icontains` 기반 CharFilter를 적용했습니다.\n3) `Categories`를 `MPTTModel` + `TreeForeignKey` 구조로 전환해 계층 조회를 단순화했습니다.\n4) 페이지네이션으로 응답량을 제어해 목록 조회 부담을 낮췄습니다.',
                            result: '1) 검색 조건 확장 시 필터 정의 추가로 대응 가능한 구조가 되었습니다.\n2) 카테고리 계층 관리/조회의 일관성이 높아져 운영 복잡도가 줄었습니다.',
                            skills: ['Search API', 'django-filter', 'MPTT', 'Pagination'],
                            highlights: [
                                'Single list entrypoint with filterset composition',
                                'keyword and category filters use icontains lookup',
                                'Tree category model improves hierarchical traversal',
                                'Paged response controls list payload size'
                            ],
                            links: [
                                { label: 'CODE_PRODUCT_VIEWS', href: 'https://github.com/ramyo564/realtime_auction/blob/develop/product/views.py' },
                                { label: 'CODE_PRODUCT_FILTERS', href: 'https://github.com/ramyo564/realtime_auction/blob/develop/product/filters.py' },
                                { label: 'CODE_PRODUCT_MODELS', href: 'https://github.com/ramyo564/realtime_auction/blob/develop/product/models.py' },
                                { label: 'CODE_PRODUCT_SERIALIZER', href: 'https://github.com/ramyo564/realtime_auction/blob/develop/product/serializers.py' }
                            ]
                        },
                        {
                            mermaidId: 'case-auction-lifecycle-automation',
                            anchorId: 'realtime-auction-case-4',
                            title: 'Case 4. 경매-결제-채팅 라이프사이클 자동화',
                            subtitle: '2023-09 ~ 2023-11 · Celery Beat 운영 루프',
                            overview: '경매 시작/종료, 낙찰 후 결제 생성, 거래 채팅방 생성을\n주기 작업으로 연결한 운영 자동화 케이스입니다.',
                            role: '주기 작업 설계, 상태 전이 연결, 후속 도메인 task 체인 구성',
                            stackSummary: 'Celery, Celery Beat, Auction task, Payment task, Chat task',
                            problem: '1) 경매방 생성/종료를 수동으로 관리하면 상태 누락이 발생할 수 있습니다.\n2) 낙찰 후 결제/채팅 준비가 지연되면 사용자 거래 경험이 단절됩니다.',
                            solution: '1) `check_and_create_auction_rooms`를 주기 실행해 시작 시점 경매방 생성과 종료 시 비활성화를 처리했습니다.\n2) winner 목록 조회 시 `create_payment_for_auction_winner` task를 통해 결제 인스턴스를 생성했습니다.\n3) `create_chatting_for_completed_auctions` task로 완료 경매의 1:1 채팅방 생성을 자동화했습니다.\n4) `config/settings.py`에서 Celery Beat 스케줄을 통합 관리했습니다.',
                            result: '1) 경매 종료 후 결제/채팅 준비가 자동으로 이어지는 운영 루프가 완성되었습니다.\n2) 수동 운영 의존도를 줄여 상태 불일치 가능성을 낮췄습니다.',
                            skills: ['Lifecycle Automation', 'Celery Beat', 'Background Jobs', 'Operational Consistency'],
                            highlights: [
                                'Beat scheduler periodically enforces auction room state',
                                'Winner-to-payment generation executed via async task',
                                'Completed auctions trigger one-to-one chat room bootstrap',
                                'Lifecycle steps are centralized in settings task schedule'
                            ],
                            links: [
                                { label: 'CODE_SETTINGS_SCHEDULE', href: 'https://github.com/ramyo564/realtime_auction/blob/develop/config/settings.py' },
                                { label: 'CODE_AUCTION_TASK', href: 'https://github.com/ramyo564/realtime_auction/blob/develop/auction/tasks.py' },
                                { label: 'CODE_PAYMENT_TASK', href: 'https://github.com/ramyo564/realtime_auction/blob/develop/payment/tasks.py' },
                                { label: 'CODE_CHAT_TASK', href: 'https://github.com/ramyo564/realtime_auction/blob/develop/chat/tasks.py' }
                            ]
                        }
                    ]
                },
                {
                    title: 'SECURITY / ASGI ROUTING',
                    desc: 'WebSocket 인증 경계와 채널 라우팅 보호',
                    cards: [
                        {
                            mermaidId: 'case-websocket-jwt-gate',
                            anchorId: 'realtime-auction-case-5',
                            title: 'Case 5. WebSocket JWT 인증 경계 강화',
                            subtitle: '2023-09 · ASGI middleware 연동',
                            overview: '실시간 채널(auction/chat)에서 비인증 사용자의 접근을 줄이기 위해\nWebSocket 전용 JWT 미들웨어를 적용한 케이스입니다.',
                            role: 'ASGI 라우팅 인증 경계 설정, scope 사용자 주입, consumer 접근 정책 정리',
                            stackSummary: 'ProtocolTypeRouter, WebSocketJWTAuthMiddleware, SimpleJWT AccessToken',
                            problem: '1) WebSocket 연결은 HTTP 인증 흐름과 분리되어 별도 인증 경계가 필요합니다.\n2) scope user가 보장되지 않으면 실시간 채널에서 비인증 접근 통제가 어렵습니다.',
                            solution: '1) `config/asgi.py`의 websocket 경로를 `WebSocketJWTAuthMiddleware`로 래핑했습니다.\n2) 미들웨어에서 cookie 헤더 token을 파싱하고 `AccessToken`으로 사용자 식별을 수행했습니다.\n3) 유효하지 않은 토큰은 `AnonymousUser`로 처리하고 consumer에서 접속을 종료했습니다.\n4) auction/chat 라우팅을 단일 URLRouter 체인으로 통합해 인증 정책을 일관 적용했습니다.',
                            result: '1) 실시간 연결에서도 JWT 기반 사용자 식별 경로가 명확해졌습니다.\n2) 비인증 접속 차단 정책을 HTTP API와 유사한 수준으로 맞출 수 있게 되었습니다.',
                            skills: ['WebSocket Security', 'ASGI Routing', 'JWT', 'Channels Middleware'],
                            highlights: [
                                'ASGI websocket branch wrapped by custom JWT middleware',
                                'Cookie token parsed and decoded to resolve scope user',
                                'Invalid token falls back to AnonymousUser flow',
                                'Auction and chat routes share one authenticated router chain'
                            ],
                            links: [
                                { label: 'CODE_ASGI', href: 'https://github.com/ramyo564/realtime_auction/blob/develop/config/asgi.py' },
                                { label: 'CODE_WS_MIDDLEWARE', href: 'https://github.com/ramyo564/realtime_auction/blob/develop/auction/middlewares.py' },
                                { label: 'CODE_AUCTION_CONSUMER', href: 'https://github.com/ramyo564/realtime_auction/blob/develop/auction/consumers.py' },
                                { label: 'CODE_CHAT_CONSUMER', href: 'https://github.com/ramyo564/realtime_auction/blob/develop/chat/consumers.py' }
                            ]
                        }
                    ]
                }
            ]
        }
    ],

    contact: {
        sectionId: 'contact',
        panelTitle: 'CONTACT',
        panelUid: 'ID: RT-AUC-COMMS',
        description: 'Realtime Auction 포트폴리오 관련 문의는 아래 채널로 부탁드립니다.',
        actions: [
            { label: 'EMAIL', href: 'mailto:yohan032yohan@gmail.com' },
            { label: 'GITHUB', href: 'https://github.com/ramyo564/realtime_auction' },
            { label: 'TEAM_REPO', href: 'https://github.com/wodnrP/realtime_auction' }
        ]
    },

    mermaid: {
        theme: 'dark',
        securityLevel: 'loose',
        fontFamily: 'Inter',
        flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'linear'
        }
    },

    diagrams
};
