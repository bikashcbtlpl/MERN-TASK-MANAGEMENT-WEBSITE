import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import axiosInstance from "../api/axiosInstance";
import { useAuth } from "./AuthContext";

const ProjectContext = createContext();

export function ProjectProvider({ children }) {
    const { user, loading: authLoading } = useAuth();

    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProjectState] = useState("");
    const [projectsLoaded, setProjectsLoaded] = useState(false);
    const saveTimeoutRef = useRef(null);

    /* ── Load projects — only once user is authenticated ── */
    useEffect(() => {
        if (authLoading) return; // wait for auth to finish

        if (!user) {
            setProjects([]);
            setSelectedProjectState("");
            setProjectsLoaded(false);
            return;
        }

        const init = async () => {
            try {
                const projRes = await axiosInstance.get("/projects");
                const raw = projRes.data;
                const list = Array.isArray(raw) ? raw : raw?.projects || [];
                setProjects(list);

                // Use the savedProject from auth verify response (already in user.preferences)
                const savedId = user?.preferences?.selectedProject || "";
                const exists = list.some(
                    (p) =>
                        String(p._id) === String(savedId) ||
                        String(p.id) === String(savedId),
                );
                setSelectedProjectState(exists ? savedId : "");
            } catch (err) {
                console.warn("ProjectContext: failed to load projects", err?.message);
            } finally {
                setProjectsLoaded(true);
            }
        };

        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?._id, authLoading]); // re-run only when the user identity changes

    /* ── Debounced API save ── */
    const persistToServer = useCallback((projectId) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await axiosInstance.put("/settings/preferences", {
                    selectedProject: projectId,
                });
            } catch (err) {
                console.warn("ProjectContext: failed to persist selectedProject", err?.message);
            }
        }, 400);
    }, []);

    const setSelectedProject = useCallback(
        (projectId) => {
            const val = String(projectId || "");
            setSelectedProjectState(val);
            persistToServer(val);
        },
        [persistToServer],
    );

    return (
        <ProjectContext.Provider
            value={{ projects, selectedProject, setSelectedProject, projectsLoaded }}
        >
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    return useContext(ProjectContext);
}

export default ProjectContext;
