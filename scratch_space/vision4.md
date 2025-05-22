graph TD;
    Eve1["EVE 1.0"]
    BaseReact["Base React website"]
    SparxConv["SparxEA conversion functionality"]
    WikiPlat["Wiki platform"]

    PubmdLive["Pubmd Live"]
    RagApp["Rag-app"]
    DoViewAg["DoView Agent"]
    Eve2["EVE 2.0"]
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

    Eve1 --> BaseReact
    Eve1 --> SparxConv

    BaseReact --> WikiPlat
    SparxConv --> SparxMod

    WikiPlat --> PubmdW
    PubmdCore --> PubmdW
    PubmdCore --> PubmdLite
    PubmdCore --> PubmdCLI
    
    PubmdW --> PubmdLive
    PubmdW --> Modules      
    
    Modules --> PubmdLive

    RagMod --> RagApp
    SparxMod --> Eve2

    DoViewAg --> DoView
    RagApp --> DoView

    %% Styling
    style PubmdCore fill:#ccffcc,stroke:#333,stroke-width:2px
    style PubmdLite fill:#ccffcc,stroke:#333,stroke-width:2px
    style PubmdCLI fill:#ccffcc,stroke:#333,stroke-width:2px
    style PubmdW fill:#ccffcc,stroke:#333,stroke-width:2px
    style RagMod fill:#ccffcc,stroke:#333,stroke-width:2px
    style PubmdLive fill:#ccffcc,stroke:#333,stroke-width:2px
    style RagApp fill:#ccffcc,stroke:#333,stroke-width:2px
    style DoView fill:#ccffcc,stroke:#333,stroke-width:2px
    style Eve2 fill:#ccffcc,stroke:#333,stroke-width:2px

    style SparxMod fill:#cceeff,stroke:#333,stroke-width:2px