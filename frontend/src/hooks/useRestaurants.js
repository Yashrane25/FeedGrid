import { useState, useEffect, useCallback } from "react";
import { getRestaurants } from "../services/restaurantService";

//Custom hook for fetching and filtering restaurants
const useRestaurants = () => {
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [filters, setFilters] = useState({
        search: "",
        city: "",
        cuisine: "",
        sort: "createdAt",
        page: 1,
        limit: 9,
    });

    const fetchRestaurants = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = {};
            if (filters.search) params.search = filters.search;
            if (filters.city) params.city = filters.city;
            if (filters.cuisine) params.cuisine = filters.cuisine;
            if (filters.sort) params.sort = filters.sort;
            params.page = filters.page;
            params.limit = filters.limit;

            const data = await getRestaurants(params);
            setRestaurants(data.restaurants);
            setTotal(data.total);
            setTotalPages(data.totalPages);
        } catch (err) {
            setError(
                err.response?.data?.message || "Failed to fetch restaurants"
            );
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchRestaurants();
    }, [fetchRestaurants]);

    const updateFilter = useCallback((key, value) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value,
            page: key === "page" ? value : 1,
        }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters({
            search: "",
            city: "",
            cuisine: "",
            sort: "createdAt",
            page: 1,
            limit: 9,
        });
    }, []);

    return {
        restaurants,
        loading,
        error,
        total,
        totalPages,
        filters,
        updateFilter,
        resetFilters,
        refetch: fetchRestaurants,
    };
};

export default useRestaurants;