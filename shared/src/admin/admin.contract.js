"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SosAlertStatus = exports.EventNoteSeverity = exports.ItineraryStatus = void 0;
var ItineraryStatus;
(function (ItineraryStatus) {
    ItineraryStatus["PENDING"] = "PENDING";
    ItineraryStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ItineraryStatus["COMPLETED"] = "COMPLETED";
    ItineraryStatus["DELAYED"] = "DELAYED";
})(ItineraryStatus || (exports.ItineraryStatus = ItineraryStatus = {}));
var EventNoteSeverity;
(function (EventNoteSeverity) {
    EventNoteSeverity["INFO"] = "INFO";
    EventNoteSeverity["WARNING"] = "WARNING";
    EventNoteSeverity["CRITICAL"] = "CRITICAL";
})(EventNoteSeverity || (exports.EventNoteSeverity = EventNoteSeverity = {}));
var SosAlertStatus;
(function (SosAlertStatus) {
    SosAlertStatus["PENDING"] = "PENDING";
    SosAlertStatus["ATTENDED"] = "ATTENDED";
    SosAlertStatus["CANCELLED"] = "CANCELLED";
    SosAlertStatus["RESOLVED"] = "RESOLVED";
})(SosAlertStatus || (exports.SosAlertStatus = SosAlertStatus = {}));
//# sourceMappingURL=admin.contract.js.map