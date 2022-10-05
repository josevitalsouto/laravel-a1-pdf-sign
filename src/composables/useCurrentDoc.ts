import { reactive, ref, watch } from "vue";
import type { RouteLocationNormalizedLoaded, Router } from "vue-router";
import useDoc from "@/composables/useDoc";
import type { Doc } from "@/interfaces/Doc";
import { useMemoize } from "@vueuse/core";

const currentDocMD = ref<string | void | null>(null);
const currentDocVersion = ref<string | null | undefined>(null);
const currentDocObject = reactive(<Doc>{});
const currentPageObject = reactive({});
const loadingDoc = ref<boolean>(false);
const fetchErros = ref<string | null | undefined>(null);
const { docs } = useDoc();

const filterVersionList = (version?: string) => {
    Object.assign(
        currentDocObject,
        docs.find((doc) => doc.version === version)
    );
};

const filterPageObject = (page?: string) => {
    if (Object.keys(currentDocObject)) {
        const filterPage = currentDocObject.sections.find(
            (section) =>
                section.url === page ||
                section.subSections?.find((sub) => sub.url === page)
        );

        if (filterPage?.subSections?.length) {
            return (
                filterPage.subSections.find((section) => section.url === page) ??
                filterPage
            );
        }
        return filterPage;
    }

    return {};
};

const getDoc = async (version?: string, page?: string) => {
    const markdownUrl = `/docs/${ version }/${ page }.md`;
    loadingDoc.value = true
    currentDocVersion.value = version
    filterVersionList(version)
    Object.assign(currentPageObject, filterPageObject(page))
    fetchErros.value = null
    currentDocMD.value = null
    const getMd = useMemoize(
        async (markdownUrl: string) => fetch(markdownUrl)
            .then((res) => {
                if (res.status >= 400) {
                    fetchErros.value = "The page you requested was not found.";
                    return null
                }

                return res.text()
            })
            .catch(() => {
                loadingDoc.value = false
                fetchErros.value = "An error occurred during the process."
            })
    );

    currentDocMD.value = await getMd(markdownUrl);
    loadingDoc.value = false;
    window.scrollTo(0, 0);
};

const changeCurrentVersion = async (version: string, router: Router) => {
    await router.push({
        name: "docs-versioned",
        params: { version, page: "home" },
    });
};

const generateDocUrl = (sectionUrl: string) => {
    return `/docs/${ currentDocVersion.value }/${ sectionUrl }`;
};

const watchRouteChanges = async (
    route: RouteLocationNormalizedLoaded,
    router: Router
) => {
    watch(
        () => route.params.version,
        (newValue) => {
            if (newValue) {
                const { version, page } = route.params;
                getDoc(String(version), String(page));
            }
        },
        {
            deep: true,
        }
    );

    watch(
        () => route.name,
        async (newValue) => {
            if (newValue && !route.params.version) {
                await router.push({
                    name: "docs-versioned",
                    params: { version: "1.x", page: "home" },
                });
            }
        }
    );
};

export default () => ({
    currentDocMD,
    currentDocVersion,
    currentDocObject,
    fetchErros,
    currentPageObject,
    loadingDoc,
    filterPageObject,
    getDoc,
    watchRouteChanges,
    filterVersionList,
    generateDocUrl,
    changeCurrentVersion,
});
