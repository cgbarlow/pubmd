# Vision for modular component architecture
Tying all my ideas together.

```mermaid
graph TD;
    %% Non-Pubmd nodes
    Eve1["EVE 1.0"]
    SparxConv["SparxEA conversion functionality"]
    BaseReact["Base React website"]
    WikiPlat["Wiki platform"]
    RagApp["Rag-app"]
    Eve2["EVE 2.0"]
    DoView["DoView"]
    DoViewAg["DoView Agent"]

    subgraph "Pubmd components"
        PubmdCore["Pubmd (core)"]
        PubmdLite["Pubmd Lite"]
        PubmdCLI["Pubmd CLI"]
        PubmdW["Pubmd Wiki"]
        PubmdLive["Pubmd Live"]

        subgraph "Modules"
            SparxMod["SparxEA Module"]
            RagMod["RAG Module"]
        end
    end

    %% links
    Eve1 --> SparxConv
    SparxConv --> SparxMod 
    Eve1 --> BaseReact
    BaseReact --> WikiPlat
    WikiPlat --> PubmdW
    PubmdCore --> PubmdW
    PubmdCore --> PubmdLite
    PubmdCore --> PubmdCLI
    PubmdCore --> PubmdLive
    RagApp --> DoView
    DoViewAg --> DoView
    PubmdW --> RagMod 
    RagMod --> RagApp 
    PubmdW --> Eve2
    SparxMod --> Eve2 
