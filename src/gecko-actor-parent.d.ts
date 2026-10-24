declare class JSWindowActorParent {
    public browsingContext?: {
        top?: {
            embedderElement?: {
                ownerDocument?: {
                    defaultView?: Window | null;
                };
            };
        };
    };
    public receiveMessage(message: { name: string; data: { generating: boolean; progress: string } }): void;
}
