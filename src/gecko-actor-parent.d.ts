declare class JSWindowActorParent {
    public browsingContext?: {
        top?: {
            embedderElement?: { ownerGlobal: Window };
        };
    };
    public receiveMessage(message: { name: string; data: { generating: boolean } }): void;
}
