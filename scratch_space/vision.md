```mermaid
graph TD;
    Eve1["EVE 1.0"]
    SparxConv["SparxEA conversion functionality"]
    BaseReact["Base React website"]
    WikiPlat["Wiki platform"]
    PubmdW["Pubmd Wiki"]
    PubmdCore["Pubmd (core)"]
    PubmdLite["Pubmd Lite"]
    PubmdCLI["Pubmd CLI"]
    PubmdLive["Pubmd Live"]
    RagApp["Rag-app"]
    Eve2["Eve 2.0"]
    DoView["DoView"]

    Eve1 --> SparxConv
    SparxConv --> Eve2
    Eve1 --> BaseReact
    BaseReact --> WikiPlat
    WikiPlat --> PubmdW
    PubmdCore --> PubmdLite
    PubmdCore --> PubmdCLI
    PubmdCore --> PubmdW
    PubmdCore --> PubmdLive
    RagApp --> DoView
    PubmdW --> RagApp
    PubmdW --> Eve2