import * as ko from "knockout";
import { IContextCommand, ViewManager, ViewManagerMode } from "@paperbits/common/ui";

interface CommandConfig {
    element: HTMLElement;
    command: IContextCommand;
}


export class ContextualCommandBindingHandler {
    constructor(viewManager: ViewManager) {
        ko.bindingHandlers["contextualCommand"] = {
            init(element: HTMLElement, valueAccessor: () => CommandConfig): void {
                const config = valueAccessor();

                const bindings = {
                    background: {
                        color: config.command.color
                    },
                    attr: {
                        title: config.command.tooltip
                    }
                };

                if (config.command.component) {
                    bindings["balloon"] = {
                        component: config.command.component,
                        onOpen: () => {
                            viewManager.pauseContextualEditors();

                            if (!!config.command.doNotClearSelection) {
                                return;
                            }

                            viewManager.clearSelection();
                        },
                        onClose: () => {
                            viewManager.resumeContextualEditors();
                        }
                    };
                }
                else if (config.command.callback) {
                    bindings["click"] = config.command.callback;
                }

                if (config.command.position) {
                    bindings["stickTo"] = { target: config.element, position: config.command.position };
                }

                ko.applyBindingsToNode(element, bindings, null);
            }
        };
    }
}