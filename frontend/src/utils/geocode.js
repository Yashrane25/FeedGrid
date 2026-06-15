export const geocodeAddress = async (address) => {
    //Build a full address string from our address object
    const query = [
        address.street,
        address.city,
        address.state,
        address.pincode,
        "India",
    ]
        .filter(Boolean)
        .join(", ");

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`;

        const response = await fetch(url, {
            headers: {
                //Nominatim requires a User Agent header identifying the app
                "User-Agent": "FeedGrid/1.0 (portfolio project)",
            },
        });

        const data = await response.json();

        if (data.length === 0) {
            console.warn("Geocoding: no results for address:", query);
            return null;
        }

        return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
        };
    } catch (error) {
        console.error("Geocoding failed:", error);
        return null;
    }
};