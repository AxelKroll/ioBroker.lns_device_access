//import { TestHarness } from "@iobroker/testing/build/tests/integration/lib/harness";

const {readFileSync} = require("fs");

function readDevices( outerThis, sPath ) {

    const deviceFn = sPath + "/objects/manageddevices.csv";

    const deviceData = readFileSync(deviceFn, "utf-8");

    const deviceInfos = deviceData.split(/\r?\n/ );

    let isHeader = true;

    deviceInfos.forEach(sLine => {
        if (isHeader) 
             isHeader = false;
        else {
            const sParts = sLine.split("|");
            const sId = sParts[0];
            const sName = sParts[1];
            const sDevice = sParts[2];
            const sFB = sParts[3];
            const sVar = sParts[4];

            const sStateName = "[" + sId + "]"

            outerThis.setObjectNotExistsAsync(sStateName, {
                type: "state",
                common: {
                    name: sName,
                    type: "number",
                    role: "indicator",
                    read: true,
                    write: true,
                },
                native: {},
            });
    
            // In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
            outerThis.subscribeStates(sStateName);
    
        }
    });
}

export{ readDevices}   