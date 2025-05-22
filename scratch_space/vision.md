```mermaid
graph TD;
    %% Non-Pubmd nodes
    Eve1["EVE 1.0"]
    SparxConv["SparxEA conversion functionality"]
    BaseReact["Base React website"]
    WikiPlat["Wiki platform"]
    RagApp["Rag-app"]
    Eve2["Eve 2.0"]
    DoView["DoView"]
    DoViewAg["DoView Agent"]
    SparxMod["SparxEA Module"]
    RagMod["RAG Module"]

    subgraph "Pubmd components"
        PubmdCore["Pubmd (core)"]
        PubmdLite["Pubmd Lite"]
        PubmdCLI["Pubmd CLI"]
        PubmdW["Pubmd Wiki"]
        PubmdLive["Pubmd Live"]
    end

    %% links
    Eve1 --> SparxConv
    SparxConv --> SparxMod
    SparxMod --> Eve2
    Eve1 --> BaseReact
    BaseReact --> WikiPlat
    WikiPlat --> PubmdW 
    PubmdCore --> PubmdLite
    PubmdCore --> PubmdCLI
    PubmdCore --> PubmdW
    PubmdCore --> PubmdLive
    RagApp --> DoView
    DoViewAg --> DoView
    PubmdW --> RagMod 
    RagMod --> RagApp
