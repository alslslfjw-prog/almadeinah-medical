/**
 * @module hooks/useEquipments
 * @description Hook for fetching equipment data.
 */

import { useState, useEffect } from 'react';
import { getEquipments, getEquipmentById } from '../api/equipments';

/** Fetch all equipments (list view). */
export function useEquipments() {
    const [equipments, setEquipments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        getEquipments().then(({ data, error: err }) => {
            setIsLoading(false);
            if (err) { setError(err.message); return; }
            setEquipments(data ?? []);
        });
    }, []);

    return { equipments, isLoading, error };
}

/** Fetch a single equipment item by ID. */
export function useEquipmentById(id) {
    const [equipment, setEquipment] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        getEquipmentById(id).then(({ data }) => {
            setEquipment(data);
            setIsLoading(false);
        });
    }, [id]);

    return { equipment, isLoading };
}
