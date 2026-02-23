/**
 * Utility to clear all browser cookies for the current domain.
 */
export function clearAllCookies() {
    const cookies = document.cookie.split(";");

    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        
        // Clear for current path, root path, and current domain
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
    }
    
    if (cookies.length > 0 && cookies[0] !== "") {
        console.log("Cookies System: All detected cookies have been cleared.");
    }
}
