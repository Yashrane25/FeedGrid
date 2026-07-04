//Converts a text address into { latitude, longitude }
export const geocodeAddress = async (address) => {
    try {
        const query = encodeURIComponent(address);
        const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

        const response = await fetch(url, {
            headers: {
                "User-Agent": "FoodFleet-DeliveryTracker/1.0",
            },
        });

        const data = await response.json();

        if (data && data.length > 0) {
            return {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon),
            };
        }

        return null;
    } catch (error) {
        console.error("Geocoding error:", error);
        return null;
    }
};

//Converts an address object from our DB into a search string
export const buildAddressString = (address) => {
    if (!address) return null;
    const parts = [
        address.street,
        address.city,
        address.state,
        address.pincode,
        "India",
    ].filter(Boolean);
    return parts.join(", ");
};