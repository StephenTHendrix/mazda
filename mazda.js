const fetchMazdaInventory = async () => {
    try {
        const response = await fetch('https://www.mazdausa.com/api/inventorysearch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ResultsPageSize: 100,
                Vehicle: {
                    DealerId: [34302, 34391, 34713, 34430, 34612, 34459, 34719, 34704, 34705],
                    Type: ['n'],
                    cond: ['n'],
                    Carline: ['CX5'],
                    ModelCode: ['CX5++CE+XA++'],
                    MajorInteriorColor: ['Black'],
                    InteriorColorCode: ['L_KJA', 'L_KF3', 'L_KG2', 'L_KD6', 'L_BAX', 'L_BY3', 'L_KH1', 'L_D5F', 'L_D1R', 'L_BBB', 'L_BY7', 'L_TC0', 'L_TC7', 'L_NK5', 'L_NJ2', 'L_NL3', 'L_NK3', 'L_NK1'],
                },
                Year: ['2024'],
                VehicleLocation: ['02', '01'],
                IsIntransitDisplay: true,
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error; // Re-throw the error for further handling if necessary
    }
};

const handleFetch = async () => {
    try {
        const data = await fetchMazdaInventory();
        const { TotalVehicles, Vehicles } = data.response
        console.log(countVehiclesByDealer(Vehicles))
        // const accessoriesInfo = Vehicles.flatMap(vehicle => 
        //     vehicle.DealerName === 'FREEMAN MAZDA' ? vehicle.Accessories.map(accessory => accessory) : []
        // );
        // console.log(accessoriesInfo);
    } catch (error) {
        console.error('Error during fetch:', error);
        // Handle the error as needed
    }
};

const countVehiclesByDealer = vehicles => {
    const requiredAccessories = ['SGB', 'RBG'];
    const roofRackPackageCode = '1CB'; // Roof rack package code
    const inTransitVehicles = [];

    const counts = vehicles.reduce((acc, vehicle) => {
        const dealerName = vehicle.DealerName;
        const isInTransit = vehicle.VehicleLocation === '01';
        const isEtaInDecember = vehicle.ETADate && new Date(vehicle.ETADate).getMonth() === 11; // Check if ETADate is not null and is in December
        const hasRoofRack = vehicle.Model.Packages?.some(pkg => pkg.Code === roofRackPackageCode);

        if (!acc[dealerName]) {
            acc[dealerName] = {
                inTransit: 0,
                atDealership: 0,
                inTransitWithAllRequirements: 0,
                atDealershipWithAllRequirements: 0,
                inTransitWithRoofRack: 0,
                atDealershipWithRoofRack: 0,
                decemberEta: 0,
                decemberEtaWithAllRequirements: 0,
                decemberEtaWithRoofRack: 0
            };
        }

        // Increment counters
        isInTransit ? acc[dealerName].inTransit++ : acc[dealerName].atDealership++;
        if (hasRoofRack) {
            isInTransit ? acc[dealerName].inTransitWithRoofRack++ : acc[dealerName].atDealershipWithRoofRack++;
            if (isEtaInDecember && isInTransit) {
                inTransitVehicles.push({date: vehicle.ETADate, vin: vehicle.Vin, dealer: dealerName});
                acc[dealerName].decemberEtaWithRoofRack++;
            }
        }
        if (isEtaInDecember && isInTransit) acc[dealerName].decemberEta++;

        return acc;
    }, {});

    // Calculate and assign totals
    const totalInTransit = vehicles.filter(v => v.VehicleLocation === '01').length;
    const totalAtDealership = vehicles.length - totalInTransit;
    const totalDecemberEtaWithRoofRack = vehicles.filter(v => v.VehicleLocation === '01' && new Date(v.ETADate).getMonth() === 11 && v.Model.Packages?.some(pkg => pkg.Code === roofRackPackageCode)).length;
    const totalAtDealershipWithRoofRack = vehicles.filter(v => v.VehicleLocation !== '01' && v.Model.Packages?.some(pkg => pkg.Code === roofRackPackageCode)).length;

    counts.total = {
        inTransit: totalInTransit,
        atDealership: totalAtDealership,
        decemberEtaWithRoofRack: totalDecemberEtaWithRoofRack,
        atDealershipWithRoofRack: totalAtDealershipWithRoofRack
    };

    counts.inTransitVehicles = inTransitVehicles;

    const today = new Date();
    const formattedDate = `${today.getMonth() + 1}/${today.getDate()}`;

    return JSON.stringify({ [formattedDate]: counts }, null, 2);
};


handleFetch();