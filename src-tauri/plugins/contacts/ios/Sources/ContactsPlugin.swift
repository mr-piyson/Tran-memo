import Contacts
import Foundation
import Tauri

class ContactsPlugin: Plugin {
  @objc public func loadNativeContacts(_ invoke: Invoke) throws {
    let store = CNContactStore()

    switch CNContactStore.authorizationStatus(for: .contacts) {
    case .authorized:
      readContacts(store, invoke)
    case .notDetermined:
      store.requestAccess(for: .contacts) { [weak self] granted, error in
        guard let self else {
          invoke.reject("Contacts access is unavailable")
          return
        }
        if granted {
          self.readContacts(store, invoke)
        } else {
          invoke.reject(error?.localizedDescription ?? "Contacts access was denied")
        }
      }
    case .denied, .restricted:
      invoke.reject("Contacts access is denied. Enable it in Settings to import contacts.")
    @unknown default:
      invoke.reject("Contacts access is unavailable on this device")
    }
  }

  private func readContacts(_ store: CNContactStore, _ invoke: Invoke) {
    let keys: [CNKeyDescriptor] = [
      CNContactGivenNameKey as CNKeyDescriptor,
      CNContactFamilyNameKey as CNKeyDescriptor,
      CNContactPhoneNumbersKey as CNKeyDescriptor,
      CNContactEmailAddressesKey as CNKeyDescriptor,
      CNContactFormatter.descriptorForRequiredKeys(for: .fullName),
    ]
    let request = CNContactFetchRequest(keysToFetch: keys)
    request.sortOrder = .familyName

    var result: [[String: String]] = []
    do {
      try store.enumerateContacts(with: request) { contact, _ in
        let name =
          CNContactFormatter.string(from: contact, style: .fullName)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let email = contact.emailAddresses.first.map { String($0.value) } ?? ""

        for phoneNumber in contact.phoneNumbers {
          let phone = phoneNumber.value.stringValue
            .trimmingCharacters(in: .whitespacesAndNewlines)
          if name.isEmpty || phone.isEmpty { continue }
          result.append(["name": name, "phone": phone, "email": email])
        }
      }
      invoke.resolve(result)
    } catch {
      invoke.reject(error.localizedDescription)
    }
  }
}

@_cdecl("init_plugin_contacts")
public func initPlugin() -> Plugin {
  return ContactsPlugin()
}
