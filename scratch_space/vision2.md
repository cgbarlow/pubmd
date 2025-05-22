```mermaid
graph TD;

    %% EVE 1.0 and its direct paths
    Eve1["EVE 1.0"]
    BaseReact["Base React website"]
    WikiPlat["Wiki platform"]
    SparxConv["SparxEA conversion functionality"]

    subgraph "Pubmd components"
        PubmdCore["Pubmd (core)"]
        PubmdW["Pubmd Wiki"]
        PubmdLite["Pubmd Lite"]
        PubmdCLI["Pubmd CLI"]
        PubmdLive["Pubmd Live"]

        subgraph "Modules"
            %% Order here can influence layout for incoming arrows
            SparxMod["SparxEA Module"]
            RagMod["RAG Module"]
        end
    end

    %% Lower-level applications
    Eve2["EVE 2.0"]
    RagApp["Rag-app"]
    DoView["DoView"]
    DoViewAg["DoView Agent"]

    %% --- Links ---

    %% EVE 1.0 flows
    Eve1 --> BaseReact
    BaseReact --> WikiPlat
    WikiPlat --> PubmdW

    Eve1 --> SparxConv
    SparxConv --> SparxMod

    %% Pubmd Core outputs
    PubmdCore --> PubmdW
    PubmdCore --> PubmdLite
    PubmdCore --> PubmdCLI
    PubmdCore --> PubmdLive

    %% Module inputs and outputs
    PubmdW --> RagMod
    RagMod --> RagApp

    %% EVE 2.0 inputs
    PubmdW --> Eve2
    SparxMod --> Eve2

    %% Rag-app/DoView cluster
    RagApp --> DoView
    DoViewAg --> DoView