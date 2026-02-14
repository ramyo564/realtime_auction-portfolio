export const diagrams = {
    'realtime-auction-problem-overview': `
        graph LR
        Resume[Resume Realtime Auction Section] --> SelectOne[Select One Issue]
        SelectOne --> Trace[Trace Code Path]
        Trace --> RealtimeBid[Auction Consumer]
        Trace --> PaymentFlow[Payment Flow]
        Trace --> SearchModel[Search and Modeling]
        Trace --> Automation[Celery Lifecycle]
        Trace --> Security[WebSocket Auth]
        RealtimeBid --> Problem[Problem]
        PaymentFlow --> Problem
        SearchModel --> Problem
        Automation --> Problem
        Security --> Problem
        Problem --> Cause[Root Cause]
        Cause --> Fix[Fix Process]
        Fix --> Result[Result]

        classDef b fill:#161b22,stroke:#58a6ff,color:#c9d1d9
        classDef o fill:#161b22,stroke:#d29922,color:#c9d1d9
        classDef g fill:#161b22,stroke:#238636,color:#c9d1d9
        class Resume,SelectOne,Trace,Problem,Cause b
        class Fix,RealtimeBid,PaymentFlow,SearchModel,Automation,Security o
        class Result g
    `,

    'realtime-auction-code-evidence-map': `
        graph TB
        AuctionConsumerNode[auction consumers.py] --> AuctionModelNode[auction models.py]
        AuctionConsumerNode --> AuctionRoutingNode[auction routing.py]

        PaymentViewNode[payment views.py] --> KakaoPayNode[payment platform kakao_pay.py]
        PaymentViewNode --> PaymentTaskNode[payment tasks.py]
        PaymentViewNode --> PaymentModelNode[payment models.py]

        ProductViewNode[product views.py] --> FilterNode[product filters.py]
        ProductViewNode --> ProductModelNode[product models.py]
        ProductViewNode --> ProductSerializerNode[product serializers.py]

        SettingsNode[config settings.py] --> AuctionTaskNode[auction tasks.py]
        SettingsNode --> ChatTaskNode[chat tasks.py]

        AsgiNode[config asgi.py] --> WsMiddlewareNode[auction middlewares.py]
        AsgiNode --> AuctionRoutingNode

        classDef b fill:#161b22,stroke:#58a6ff,color:#c9d1d9
        classDef o fill:#161b22,stroke:#d29922,color:#c9d1d9
        classDef g fill:#161b22,stroke:#238636,color:#c9d1d9
        class AuctionConsumerNode,PaymentViewNode,ProductViewNode,SettingsNode,AsgiNode b
        class AuctionModelNode,KakaoPayNode,FilterNode,AuctionTaskNode,WsMiddlewareNode o
        class AuctionRoutingNode,PaymentTaskNode,PaymentModelNode,ProductModelNode,ProductSerializerNode,ChatTaskNode g
    `,

    'case-bid-concurrency-guard': `
        graph TB
        BidEvent[Bid Event Received] --> AsyncBoundary[database_sync_to_async Boundary]
        AsyncBoundary --> Upsert[create_or_update_auction_message]
        Upsert --> PriceCheck{bid_price greater than final_price}
        PriceCheck -- Yes --> UpdateRoom[update_max_price and set winner]
        UpdateRoom --> Broadcast[group_send highest bid]
        Broadcast --> ClientSync[Participants Receive New Highest Bid]
        PriceCheck -- No --> Ignore[Ignore Lower or Duplicate Bid]

        classDef b fill:#161b22,stroke:#58a6ff,color:#c9d1d9
        classDef o fill:#161b22,stroke:#d29922,color:#c9d1d9
        classDef g fill:#161b22,stroke:#238636,color:#c9d1d9
        class BidEvent,AsyncBoundary,Upsert,PriceCheck b
        class UpdateRoom,Broadcast,Ignore o
        class ClientSync g
    `,

    'case-payment-state-bridge': `
        graph LR
        subgraph BeforeState [BEFORE State Gap]
            direction TB
            BeforeReady[Ready Request] --> BeforeNoLink[No Shared Context for Approval]
            BeforeNoLink --> BeforeFail[Approval Step Can Lose Payment Target]
        end

        subgraph AfterState [AFTER Bridged Flow]
            direction TB
            ReadyReq[Ready Request] --> TempMap[PAYMENT_DIC user key mapping]
            ReadyReq --> PersistTid[Persist kakao_tid and redirect URL]
            TempMap --> ApprovalReq[Approval Request Resolve Payment]
            PersistTid --> ApprovalReq
            ApprovalReq --> PaidFlag[Set paid true and payment_type]
            ListAccess[Winning Bid List Access] --> Cleanup[Expire Unpaid Payments by Timeout]
            Cleanup --> CleanList[Return Clean Pending Payment List]
        end

        classDef b fill:#161b22,stroke:#58a6ff,color:#c9d1d9
        classDef o fill:#161b22,stroke:#d29922,color:#c9d1d9
        classDef g fill:#161b22,stroke:#238636,color:#c9d1d9
        class ReadyReq,TempMap,PersistTid,ApprovalReq,ListAccess b
        class BeforeReady,BeforeNoLink,BeforeFail,Cleanup o
        class PaidFlag,CleanList g
    `,

    'case-search-mptt-standardization': `
        graph TB
        Request[GET all-products with query params] --> BaseQuery[Products filter auction_end_at greater than now]
        BaseQuery --> FilterSet[ProductsFilter keyword and category icontains]
        FilterSet --> CategoryTree[MPTT Categories and TreeForeignKey]
        FilterSet --> Paginator[PageNumberPagination]
        CategoryTree --> Serializer[ProductsSerializer with image URLs]
        Paginator --> Response[Paginated Product Response]
        Serializer --> Response

        classDef b fill:#161b22,stroke:#58a6ff,color:#c9d1d9
        classDef o fill:#161b22,stroke:#d29922,color:#c9d1d9
        classDef g fill:#161b22,stroke:#238636,color:#c9d1d9
        class Request,BaseQuery,FilterSet b
        class CategoryTree,Paginator,Serializer o
        class Response g
    `,

    'case-auction-lifecycle-automation': `
        graph TB
        BeatTick[Celery Beat Tick every 10s] --> AuctionTask[check_and_create_auction_rooms]
        AuctionTask --> CreateRoom[Create AuctionRoom if missing]
        AuctionTask --> EndAuction[Set auction_active false when end_at passed]
        EndAuction --> WinnerCheck[Winner Exists]
        WinnerCheck --> PaymentTask[create_payment_for_auction_winner]
        PaymentTask --> PaymentActive[Set room payment_active true]
        WinnerCheck --> ChatTask[create_chatting_for_completed_auctions]
        ChatTask --> ChatRoom[Create one to one Chatting]

        classDef b fill:#161b22,stroke:#58a6ff,color:#c9d1d9
        classDef o fill:#161b22,stroke:#d29922,color:#c9d1d9
        classDef g fill:#161b22,stroke:#238636,color:#c9d1d9
        class BeatTick,AuctionTask,WinnerCheck b
        class CreateRoom,EndAuction,PaymentTask,ChatTask o
        class PaymentActive,ChatRoom g
    `,

    'case-websocket-jwt-gate': `
        graph TB
        WsConnect[WebSocket Connect ws auction or chat] --> AsgiRouter[ProtocolTypeRouter websocket branch]
        AsgiRouter --> JwtMiddleware[WebSocketJWTAuthMiddleware]
        JwtMiddleware --> CookieParse[Read cookie token]
        CookieParse --> TokenDecode[AccessToken decode user_id]
        TokenDecode --> ValidUser[scope user authenticated]
        TokenDecode --> InvalidUser[AnonymousUser fallback]
        ValidUser --> ConsumerAccess[AuctionConsumer or ChatConsumer connect]
        InvalidUser --> CloseConn[Consumer closes unauthorized connection]

        classDef b fill:#161b22,stroke:#58a6ff,color:#c9d1d9
        classDef o fill:#161b22,stroke:#d29922,color:#c9d1d9
        classDef g fill:#161b22,stroke:#238636,color:#c9d1d9
        class WsConnect,AsgiRouter,JwtMiddleware,CookieParse,TokenDecode b
        class ValidUser,ConsumerAccess o
        class InvalidUser,CloseConn g
    `
};
