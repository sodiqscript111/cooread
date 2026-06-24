const testArticle = {
    url: "https://en.wikipedia.org/wiki/Artificial_intelligence",
    title: "Artificial Intelligence - Wikipedia",
    text: "Artificial intelligence (AI), in its broadest sense, is intelligence exhibited by machines, particularly computer systems. It is a field of research in computer science that develops and studies methods and software which enable machines to perceive their environment and uses learning and intelligence to take actions that maximize their chances of achieving defined goals.",
    email: "test@example.com"
};

async function runTest() {
    console.log("Simulating an extension POST request to /api/articles/save...");
    
    const response = await fetch("http://localhost:3000/api/articles/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testArticle)
    });

    const data = await response.json();
    console.log("Response:", data);
}

runTest();
