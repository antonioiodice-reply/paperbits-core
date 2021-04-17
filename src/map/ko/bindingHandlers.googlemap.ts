import * as ko from "knockout";
import { Loader, LoaderOptions } from "@googlemaps/js-api-loader";
import { MapRuntimeConfig } from "./runtime/mapRuntimeConfig";


export class GooglmapsBindingHandler {
    constructor() {
        const attach = this.attach.bind(this);

        ko.bindingHandlers["googlemap"] = {
            init(element: Element, valueAccessor: () => MapRuntimeConfig): void {
                const configuration = valueAccessor();
                attach(element, ko.toJS(configuration));
            }
        };
    }

    private async attach(element: Element, configuration: MapRuntimeConfig): Promise<void> {
        const options: Partial<LoaderOptions> = {/* todo */ };
        const loader = new Loader({ apiKey: configuration.apiKey, ...options });
        await loader.load();

        const geocoder = new google.maps.Geocoder();
        const mapOptions: google.maps.MapOptions = {};
        const map = new google.maps.Map(element, mapOptions);

        if (!configuration.zoom) {
            configuration.zoom = 17;
        }
        else if (typeof configuration.zoom === "string") {
            configuration.zoom = parseInt(configuration.zoom);
        }

        map.setOptions({
            streetViewControl: false,
            mapTypeControl: false,
            scaleControl: true,
            rotateControl: false,
            scrollwheel: false,
            disableDoubleClickZoom: true,
            draggable: false,
            disableDefaultUI: true,
            mapTypeId: configuration.mapType,
            zoom: configuration.zoom
        });

        const marker: google.maps.Marker = new google.maps.Marker();
        marker.setMap(map);

        if (configuration.markerIcon) {
            const icon: google.maps.Icon = {
                url: configuration.markerIcon,
                scaledSize: new google.maps.Size(50, 50)
            };

            marker.setIcon(icon);
        }

        const locationToPosition = async (location: string): Promise<google.maps.LatLng> => {
            const request: google.maps.GeocoderRequest = {};
            const coordinates = new RegExp("(-?\\d+\(?:.\\d+)?),(-?\\d+\(?:.\\d+)?)").exec(location);

            if (coordinates) {
                request.location = {
                    lat: <any>coordinates[1] * 1,
                    lng: <any>coordinates[2] * 1,
                };
            }
            else {
                request.address = location;
            }

            return new Promise<google.maps.LatLng>((resolve, reject) => {
                geocoder.geocode(request, (results: google.maps.GeocoderResult[], status) => {
                    const position = results[0].geometry.location;

                    if (status === google.maps.GeocoderStatus.OK) {
                        resolve(position);
                    }

                    reject(`Could not geocode specified location: "${location}".`);
                });
            });
        };

        const setCaption = (caption: string) => {
            const infowindow = new google.maps.InfoWindow();
            infowindow.setContent(caption);

            if (caption && caption.length > 0) {
                infowindow.open(map, marker);
            }
            else {
                infowindow.close();
            }
        };

        class Popup extends google.maps.OverlayView {
            private content: HTMLElement;
            private position: any;

            constructor(position: google.maps.LatLng) {
                super();
                this.position = position;

                this.content = document.createElement("div");

                // Optionally stop clicks, etc., from bubbling up to the map.
                Popup.preventMapHitsAndGesturesFrom(this.content);
            }

            /** Called when the popup is added to the map. */
            public onAdd(): void {
                this.content.setAttribute("data-toggle", "popup");
                this.content.setAttribute("data-target", `#${configuration.markerPopupKey.replace("popups/", "popups")}`);

                this.getPanes().floatPane.appendChild(this.content);

                console.log(configuration.markerPopupKey);

                document.dispatchEvent(new CustomEvent("onPopupRequested", { detail: configuration.markerPopupKey }));
            }

            /** Called when the popup is removed from the map. */
            public onRemove(): void {
                // if (this.popupElement.parentElement) {
                //     this.popupElement.parentElement.removeChild(this.popupElement);
                // }
            }

            /** Called each frame when the popup needs to draw itself. */
            public draw(): void {
                document.dispatchEvent(new CustomEvent("onPopupRepositionRequested", { detail: this.content }));
            }
        }

        const position = await locationToPosition(configuration.location);

        marker.setPosition(position);
        map.setCenter(position);


        if (configuration.markerPopupKey) {
            const popup = new Popup(position);
            popup.setMap(map);
        }
        else {
            setCaption(configuration.caption);
        }

    }
}

