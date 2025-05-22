# Vision for modular component architecture
Tying all my ideas together.

```mermaid
graph TD;
    Eve1["EVE 1.0"]
    SparxConv["SparxEA conversion functionality"]
    BaseReact["Base React website"]
    WikiPlat["Wiki platform"]

    PubmdLive["Pubmd Live"]
    RagApp["Rag-app"]
    Eve2["EVE 2.0"]
    DoViewAg["DoView Agent"]
    DoView["DoView"]

    subgraph "Pubmd components"
        PubmdCore["Pubmd (core)"]
        PubmdLite["Pubmd Lite"]
        PubmdCLI["Pubmd CLI"]
        
        subgraph PubmdW_container["Pubmd Wiki"]
            PubmdW["Pubmd Wiki"]
            subgraph "Modules"
                RagMod["RAG Module"]
                SparxMod["SparxEA Module"]
            end
        end
    end

    Eve1 --> SparxConv
    SparxConv --> SparxMod
    Eve1 --> BaseReact
    BaseReact --> WikiPlat
    WikiPlat --> PubmdW
    PubmdCore --> PubmdW
    PubmdCore --> PubmdLite
    PubmdCore --> PubmdCLI
    
    PubmdW --> PubmdLive
    PubmdW --> Modules      
    
    Modules --> PubmdLive

    DoViewAg --> DoView
    RagMod --> RagApp
    RagApp --> DoView
    SparxMod --> Eve2