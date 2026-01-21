import { ref } from 'vue';

export function useSocial() {
  const posting = ref(false);
  const error = ref(null);
  const success = ref(false);

  const postToBlueSky = async (postText, articleItem) => {
    posting.value = true;
    error.value = null;
    success.value = false;

    try {
      const payload = {
        text: postText,
        linkData: {
          url: articleItem.link,
          title: articleItem.title,
          description: articleItem.description ? articleItem.description.substring(0, 200) : ''
        }
      };

      const response = await fetch('/.netlify/functions/post-bluesky', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Unknown error posting to BlueSky');
      }

      success.value = true;
      return result;

    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      posting.value = false;
    }
  };

  const resetSocial = () => {
    error.value = null;
    success.value = false;
    posting.value = false;
  };


  const postToLinkedIn = async (postText, articleItem) => {
    posting.value = true;
    error.value = null;
    success.value = false;

    try {
      const payload = {
        text: postText,
        linkData: {
          url: articleItem.link,
          title: articleItem.title,
          description: articleItem.description ? articleItem.description.substring(0, 200) : ''
        }
      };

      const response = await fetch('/.netlify/functions/post-linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Unknown error posting to LinkedIn');
      }

      success.value = true;
      return result;

    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      posting.value = false;
    }
  };

  return {
    postToBlueSky,
    postToLinkedIn,
    posting,
    error,
    success,
    resetSocial
  };
}