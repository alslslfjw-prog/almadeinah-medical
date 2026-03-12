/**
 * @module hooks/useScans
 * @description Thin hooks that read from the persistent scansStore where appropriate.
 * Data survives component remount — no blank flash on navigation.
 */

import { useState, useEffect } from 'react';
import useScansStore from '../store/scansStore';
import {
    getScanById,
    getExaminations, getExaminationById,
    getMedicalPackages, getMedicalPackageById,
    getLabTests, getMedicalTestsGuide,
} from '../api/scans';

/** Fetch all scans (list view) — persistent store. */
export function useScans() {
    const { scans, isLoading, error, fetchScans } = useScansStore();

    useEffect(() => {
        fetchScans();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return { scans, isLoading, error };
}

/** Fetch a single scan by ID. */
export function useScanById(id) {
    const [scan, setScan] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id) return;
        getScanById(id).then(({ data, error: err }) => {
            setIsLoading(false);
            if (err) { setError(err.message); return; }
            setScan(data);
        });
    }, [id]);

    return { scan, isLoading, error };
}

/** Fetch all examination categories. */
export function useExaminations() {
    const [examinations, setExaminations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getExaminations().then(({ data }) => {
            setExaminations(data ?? []);
            setIsLoading(false);
        });
    }, []);

    return { examinations, isLoading };
}

/** Fetch a single examination by ID. */
export function useExaminationById(id) {
    const [examination, setExamination] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        getExaminationById(id).then(({ data }) => {
            setExamination(data);
            setIsLoading(false);
        });
    }, [id]);

    return { examination, isLoading };
}

/** Fetch all medical packages. */
export function useMedicalPackages() {
    const [packages, setPackages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getMedicalPackages().then(({ data }) => {
            setPackages(data ?? []);
            setIsLoading(false);
        });
    }, []);

    return { packages, isLoading };
}

/** Fetch a single package by ID. */
export function useMedicalPackageById(id) {
    const [pkg, setPkg] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        getMedicalPackageById(id).then(({ data }) => {
            setPkg(data);
            setIsLoading(false);
        });
    }, [id]);

    return { pkg, isLoading };
}

/** Fetch lab tests list. */
export function useLabTests() {
    const [tests, setTests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getLabTests().then(({ data }) => {
            setTests(data ?? []);
            setIsLoading(false);
        });
    }, []);

    return { tests, isLoading };
}

/** Fetch the medical tests guide (with optional category filter). */
export function useMedicalTestsGuide(category) {
    const [guide, setGuide] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getMedicalTestsGuide({ category }).then(({ data }) => {
            setGuide(data ?? []);
            setIsLoading(false);
        });
    }, [category]);

    return { guide, isLoading };
}
