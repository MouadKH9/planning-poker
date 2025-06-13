import axios from 'axios'
import { toast } from 'sonner'

// Create an axios instance with a base URL from environment variables
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
    timeout: 10000, // 10 seconds
})

// Add a request interceptor for auth tokens if needed
apiClient.interceptors.request.use(
    (config) => {
        // You can add auth token logic here
        // const token = localStorage.getItem('token')
        // if (token) {
        //   config.headers.Authorization = `Bearer ${token}`
        // }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Add a response interceptor for common error handling
apiClient.interceptors.response.use(
    (response) => {
        return response
    },
    (error) => {
        // Handle common errors
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            const status = error.response.status

            if (status === 401) {
                toast.error('Authentication error', {
                    description: 'Please log in again',
                })
                // You could add logout logic here
            } else if (status === 403) {
                toast.error('Access denied', {
                    description: 'You do not have permission to perform this action',
                })
            } else if (status === 404) {
                toast.error('Resource not found', {
                    description: 'The requested resource could not be found',
                })
            } else if (status === 500) {
                toast.error('Server error', {
                    description: 'An unexpected error occurred. Please try again later',
                })
            }
        } else if (error.request) {
            // The request was made but no response was received
            toast.error('Network error', {
                description: 'Unable to connect to the server. Please check your internet connection',
            })
        } else {
            // Something happened in setting up the request that triggered an Error
            toast.error('Application error', {
                description: error.message,
            })
        }

        return Promise.reject(error)
    }
)

export default apiClient 