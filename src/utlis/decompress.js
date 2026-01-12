export const decompressGzip = async (response) => {
    try {
        const base64Data = response.data;

        const binaryStr = atob(base64Data);

        const bytes = Uint8Array.from(binaryStr, (char) => char.charCodeAt(0));

        const blob = new Blob([bytes], { type: "application/gzip" });

        const decompressionStream = new DecompressionStream("gzip");
        const decompressedStream = blob.stream().pipeThrough(decompressionStream);

        const decompressedResponse = await new Response(decompressedStream).text();

        return JSON.parse(decompressedResponse);
    } catch (error) {
        console.error("Decompression error:", error);
        throw new Error("Failed to decompress response");
    }
};