# Vision for modular component architecture
Tying all my ideas together.

```mermaid
graph TD;
    %% Define all nodes first
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

    %% Marama group - aim for left placement by defining early and connecting appropriately
    Marama["Marama"] 
    FamilyTree["Family Tree"]
    FamilyHistory["Family History"]

    subgraph "Pubmd components"
        PubmdCore["Pubmd (core)"]
        PubmdLite["Pubmd Lite"]
        PubmdCLI["Pubmd CLI"]
        
        subgraph PubmdW_container["Pubmd Wiki"]
            PubmdW["Pubmd Wiki"]
            %% Modules subgraph with internal Left-to-Right direction
            subgraph "Modules"
                direction LR 
                RagMod["RAG Module"]
                SparxMod["SparxEA Module"]
            end
        end
    end

    %% Connections
    Eve1 --> BaseReact
    Eve1 --> SparxConv 

    BaseReact --> WikiPlat
    
    WikiPlat --> PubmdW
    PubmdCore --> PubmdW
    PubmdCore --> PubmdLite
    PubmdCore --> PubmdCLI
    
    PubmdW --> PubmdLive
    PubmdW --> Modules 
    
    Modules --> PubmdLive 

    %% Connections from individual modules (which are now side-by-side within 'Modules')
    RagMod --> RagPlatform
    SparxMod --> Eve2

    DoViewAg --> DoView
    RagPlatform --> DoView
    RagPlatform --> ComplianceApp

    %% Marama group connections:
    %% Marama to be to the left of RagMod, with a horizontal connection.
    Marama --> RagMod 
    Marama --> FamilyHistory
    FamilyTree <--> FamilyHistory

    %% SparxConv connection:
    %% SparxConv to be to the right of SparxMod, with a horizontal connection (arrow from SparxConv to SparxMod).
    SparxConv --> SparxMod 

    %% Styling
    style PubmdCore fill:#0f83a0,stroke:#333,stroke-width:2px,color:#333
    style PubmdLite fill:#0f83a0,stroke:#333,stroke-width:2px,color:#333
    style PubmdCLI fill:#0f83a0,stroke:#333,stroke-width:2px,color:#333
    style PubmdW fill:#0f83a0,stroke:#333,stroke-width:2px,color:#333
    style RagMod fill:#0f83a0,stroke:#333,stroke-width:2px,color:#333
    style SparxMod fill:#0f83a0,stroke:#333,stroke-width:2px,color:#333 
    style DoView fill:#0f83a0,stroke:#333,stroke-width:2px,color:#333
    style Eve2 fill:#0f83a0,stroke:#333,stroke-width:2px,color:#333
    style ComplianceApp fill:#0f83a0,stroke:#333,stroke-width:2px,color:#333
    
    style Marama fill:#0f83a0,stroke:#333,stroke-width:2px,color:#333   
    style FamilyHistory fill:#0f83a0,stroke:#333,stroke-width:2px,color:#333
    style FamilyTree fill:#a0960f,stroke:#333,stroke-width:2px,color:#333 
    
    style SparxConv fill:#d3d3d3,stroke:#333,stroke-width:2px,color:#333  