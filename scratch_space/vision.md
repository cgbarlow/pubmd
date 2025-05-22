# Vision for modular component architecture
Tying all my ideas together.

```mermaid
graph TD;
    Eve1["EVE 1.0"]
    BaseReact["Base React website"]
    SparxConv["SparxEA conversion functionality"]
    WikiPlat["Wiki platform"]

    PubmdLive["Pubmd Live"]
    RagPlatform["Rag Platform"]
    DoViewAg["DoView Agent"]
    Eve2["EVE 2.0"]
    DoView["DoView"]
    ComplianceApp["Compliance Assistant"]

    Marama["Marama"]
    FamilyTree["Family Tree"]
    FamilyHistory["Family History"]

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

    RagMod --> RagPlatform
    SparxMod --> Eve2

    DoViewAg --> DoView
    RagPlatform --> DoView
    RagPlatform --> ComplianceApp

    Marama --> RagMod
    Marama --> FamilyHistory
    FamilyTree <--> FamilyHistory

    %% Styling
    style PubmdCore fill:#0f83a0,stroke:#333,stroke-width:2px,color:#333
    style PubmdLite fill:#0f83a0,stroke:#333,stroke-width:2px,color:#333
    style PubmdCLI fill:#0f83a0,stroke:#333,stroke-width:2px,color:#333
    style PubmdW fill:#0f83a0,stroke:#333,stroke-width:2px,color:#333
    style RagMod fill:#0f83a0,stroke:#333,stroke-width:2px,color:#333
    style DoView fill:#0f83a0,stroke:#333,stroke-width:2px,color:#333
    style Eve2 fill:#0f83a0,stroke:#333,stroke-width:2px,color:#333
    style ComplianceApp fill:#0f83a0,stroke:#333,stroke-width:2px,color:#333
    style FamilyHistory fill:#0f83a0,stroke:#333,stroke-width:2px,color:#333
    style FamilyTree fill:#a0960f,stroke:#333,stroke-width:2px,color:#333